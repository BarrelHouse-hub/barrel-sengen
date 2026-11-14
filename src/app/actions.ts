'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { makeToken, requireMe, SESSION_COOKIE } from '@/lib/session'
import { isCat } from '@/lib/data'
import { isCheckinFreq, replyCheckin, saveMessages, say } from '@/lib/mascot'
import { isPushEndpoint, pushTo, sendPush, type PushResult } from '@/lib/push'
import { MASCOT_NAME } from '@/lib/mascot-name'
import { notifyReaction } from '@/lib/notify'
import { head } from '@vercel/blob'
import { deleteBlobs, MAX_PHOTOS, PDF_TYPE, PHOTO_TYPES, uploadPrefix } from '@/lib/submissions'
import { addDays, addMonths, announceRound, isAdmin, todayJst, type Round } from '@/lib/rounds'

const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? '').trim().slice(0, max)
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v)

function samePass(input: string, expected: string) {
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export type JoinState = { error?: string }

export async function join(_prev: JoinState, form: FormData): Promise<JoinState> {
  const name = str(form, 'name', 20)
  const pass = str(form, 'pass', 100)
  const expected = process.env.BARREL_PASSCODE
  if (!expected) return { error: '合言葉がまだ設定されていません。管理者に連絡してください。' }
  if (!name) return { error: 'ニックネームを入れてください。' }
  if (!samePass(pass, expected)) return { error: '合言葉が違います。' }

  const sql = await db()
  const rows = (await sql`
    insert into members (name) values (${name})
    on conflict (name) do update set name = excluded.name
    returning id, (xmax = 0) as created
  `) as { id: string; created: boolean }[]
  if (rows[0].created) {
    await saveMessages(rows[0].id, [{ kind: 'welcome', decl_id: null, body: say.welcome(name) }])
  }
  ;(await cookies()).set(SESSION_COOKIE, makeToken(rows[0].id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  redirect('/')
}

export async function logout() {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect('/join')
}

export async function createDecl(form: FormData) {
  const me = await requireMe()
  const what = str(form, 'what', 140)
  if (!what) redirect('/new?e=empty')
  const dueRaw = str(form, 'due', 10)
  const due = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null
  const catRaw = str(form, 'cat', 10)
  const cat = isCat(catRaw) ? catRaw : 'work'
  const mode = str(form, 'mode', 10) === 'yuru' ? 'yuru' : 'gachi'
  const need = str(form, 'need', 60)
  const roundRaw = str(form, 'round', 36)
  const sql = await db()
  // 締め切り前のラウンドにだけひも付けられる
  const round = isUuid(roundRaw)
    ? ((await sql`select id from rounds where id = ${roundRaw} and deadline >= ${todayJst()}::date`) as { id: string }[])[0]
    : undefined
  await sql`
    insert into declarations (member_id, what, due, cat, mode, need, round_id)
    values (${me.id}, ${what}, ${due}, ${cat}, ${mode}, ${need}, ${round?.id ?? null})
  `
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function toggleCheer(form: FormData) {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  if (!isUuid(id)) return
  const sql = await db()
  const del = (await sql`delete from cheers where decl_id = ${id} and member_id = ${me.id} returning 1`) as unknown[]
  if (del.length === 0) {
    const added = (await sql`
      insert into cheers (decl_id, member_id) values (${id}, ${me.id}) on conflict do nothing returning 1
    `) as unknown[]
    if (added.length > 0) after(() => notifyReaction(id, me.id, { kind: 'cheer' }))
  }
  revalidatePath('/', 'layout')
}

export async function toggleOffer(form: FormData) {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  const kind = str(form, 'kind', 10) === 'intro' ? 'intro' : 'help'
  if (!isUuid(id)) return
  const sql = await db()
  const del = (await sql`
    delete from offers where decl_id = ${id} and member_id = ${me.id} and kind = ${kind} returning 1
  `) as unknown[]
  if (del.length === 0) {
    const added = (await sql`
      insert into offers (decl_id, member_id, kind)
      select ${id}, ${me.id}, ${kind}
      where exists (select 1 from declarations where id = ${id} and member_id <> ${me.id})
      on conflict do nothing
      returning 1
    `) as unknown[]
    if (added.length > 0) after(() => notifyReaction(id, me.id, { kind }))
  }
  revalidatePath('/', 'layout')
}

export type CommentState = { error?: string }

/**
 * コメントを書く。送信中はボタンを押せないようにしているが、それでも同じ人が同じ宣言に
 * 同じ本文を1分以内に送ってきたら（連打・通信のやり直し・送信後の再読み込み）1件にまとめる。
 */
export async function addComment(_prev: CommentState, form: FormData): Promise<CommentState> {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  const body = str(form, 'body', 200)
  if (!isUuid(id) || !body) return { error: 'コメントを入れてください。' }
  const sql = await db()
  // 同じ人・同じ宣言の書き込みを順番に処理して、直前の同じ本文があれば入れない
  const [, inserted] = (await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${`comment:${me.id}:${id}`}))`,
    sql`
      insert into comments (decl_id, member_id, body)
      select ${id}, ${me.id}, ${body}
      where exists (select 1 from declarations where id = ${id})
        and not exists (
          select 1 from comments
          where decl_id = ${id} and member_id = ${me.id} and body = ${body}
            and created_at > now() - interval '1 minute'
        )
      returning 1
    `,
  ])) as [unknown, unknown[]]
  if (inserted.length > 0) after(() => notifyReaction(id, me.id, { kind: 'comment', body }))
  revalidatePath('/', 'layout')
  return {}
}

/** コメントを消せるのは、書いた本人か、そのコメントが付いている宣言の持ち主だけ。それ以外は何もしない。 */
export async function deleteComment(form: FormData) {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  if (!isUuid(id)) return
  const sql = await db()
  await sql`
    delete from comments c
    using declarations d
    where c.id = ${id} and d.id = c.decl_id
      and (c.member_id = ${me.id} or d.member_id = ${me.id})
  `
  revalidatePath('/', 'layout')
}

export async function setStatus(form: FormData) {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  const raw = str(form, 'status', 10)
  const status = raw === 'done' || raw === 'miss' ? raw : 'doing'
  if (!isUuid(id)) return
  const sql = await db()
  const rows = (await sql`
    update declarations
    set status = ${status}, reported_at = case when ${status} = 'doing' then null else now() end
    where id = ${id} and member_id = ${me.id}
    returning what
  `) as { what: string }[]
  if (rows[0] && status === 'done') {
    const msgs = await saveMessages(me.id, [{ kind: 'done', decl_id: id, body: say.done(rows[0].what) }])
    await pushTo(me.id, msgs)
  }
  revalidatePath('/', 'layout')
}

export async function deleteDecl(form: FormData) {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  if (!isUuid(id)) return
  const sql = await db()
  const files = (await sql`
    select f.pathname from submission_files f join declarations d on d.id = f.decl_id
    where d.id = ${id} and d.member_id = ${me.id}
  `) as { pathname: string }[]
  await sql`delete from declarations where id = ${id} and member_id = ${me.id}`
  after(() => deleteBlobs(files.map((f) => f.pathname)))
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function markMascotRead() {
  const me = await requireMe()
  const sql = await db()
  // 開いている画面の「新着」表示は残したいので、ここでは再描画しない
  await sql`update mascot_messages set read_at = now() where member_id = ${me.id} and read_at is null`
}

/** 「調子どう？」にワンタップで返事する。記録だけでボードには出さない */
export async function answerCheckin(form: FormData) {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  const raw = str(form, 'feeling', 10)
  const feeling = raw === 'stuck' || raw === 'tired' ? raw : raw === 'good' ? 'good' : null
  if (!isUuid(id) || !feeling) return
  await replyCheckin(me.id, id, feeling)
  // 返事へのお返しはその場で見えるので、スマホ通知は送らない
  revalidatePath('/mascot')
}

/** たるまるの声かけの頻度を変える */
export async function setCheckinFreq(form: FormData) {
  const me = await requireMe()
  const freq = str(form, 'freq', 10)
  if (!isCheckinFreq(freq)) return
  const sql = await db()
  await sql`update members set checkin_freq = ${freq} where id = ${me.id}`
  revalidatePath('/mascot')
}

type PushSub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }

export async function savePushSubscription(sub: PushSub) {
  const me = await requireMe()
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : ''
  const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh : ''
  const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth : ''
  if (!isPushEndpoint(endpoint) || endpoint.length > 1000 || !p256dh || !auth) throw new Error('通知の登録に失敗しました')
  const sql = await db()
  await sql`
    insert into push_subscriptions (endpoint, member_id, p256dh, auth)
    values (${endpoint}, ${me.id}, ${p256dh.slice(0, 200)}, ${auth.slice(0, 100)})
    on conflict (endpoint) do update set member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth
  `
}

export async function deletePushSubscription(endpoint: string) {
  const me = await requireMe()
  if (typeof endpoint !== 'string') return
  const sql = await db()
  await sql`delete from push_subscriptions where endpoint = ${endpoint} and member_id = ${me.id}`
}

/** 登録した購読がサーバーに残っているか（鍵が合わず消された購読は、端末側でオンにし直してもらう） */
export async function hasPushSubscription(endpoint: string) {
  const me = await requireMe()
  if (typeof endpoint !== 'string') return false
  const sql = await db()
  const rows = (await sql`
    select 1 from push_subscriptions where endpoint = ${endpoint} and member_id = ${me.id}
  `) as unknown[]
  return rows.length > 0
}

/** 自分の端末にだけテスト通知を送る。 */
export async function sendTestPush(): Promise<PushResult> {
  const me = await requireMe()
  return sendPush(me.id, {
    title: `${MASCOT_NAME}から（テスト）`,
    body: 'テスト通知やで。これが見えてたら、ちゃんと届いてる！',
    url: '/mascot',
  })
}

export type RoundFormState = { error?: string }

/** 運営がラウンドを作る。作ったら全員にお便りとスマホ通知で知らせる。 */
export async function createRound(_prev: RoundFormState, form: FormData): Promise<RoundFormState> {
  const me = await requireMe()
  if (!(await isAdmin(me.id))) return { error: 'ラウンドを作れるのは運営だけです。' }
  const name = str(form, 'name', 30)
  if (!name) return { error: '名前を入れてください。' }
  const today = todayJst()
  const span = str(form, 'span', 10)
  const deadlineRaw = str(form, 'deadline', 10)
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw)
    ? deadlineRaw
    : span === 'month'
      ? addMonths(today, 1)
      : addDays(today, 14)
  if (deadline < today) return { error: '締め切りは今日より後にしてください。' }
  const meetupRaw = str(form, 'meetup_at', 16)
  // 入力は日本時間として受け取る
  const meetupAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(meetupRaw) ? `${meetupRaw}:00+09:00` : null
  const place = str(form, 'meetup_place', 60)
  const mapRaw = str(form, 'meetup_map_url', 500)
  let mapUrl = ''
  if (mapRaw) {
    try {
      const u = new URL(mapRaw)
      if (u.protocol !== 'https:') throw new Error()
      mapUrl = u.toString()
    } catch {
      return { error: '地図の URL は https:// で始まるものを入れてください。' }
    }
  }
  const note = str(form, 'note', 200)
  const sql = await db()
  const rows = (await sql`
    insert into rounds (name, deadline, meetup_at, meetup_place, meetup_map_url, note, created_by)
    values (${name}, ${deadline}, ${meetupAt}, ${place}, ${mapUrl}, ${note}, ${me.id})
    returning id, name, to_char(deadline, 'YYYY-MM-DD') as deadline, meetup_at, meetup_place, meetup_map_url, note
  `) as Round[]
  const round = rows[0]
  after(async () => {
    try {
      const sent = await announceRound(round)
      for (const [id, msgs] of sent) await pushTo(id, msgs)
    } catch (e) {
      console.error('announceRound failed', e)
    }
  })
  revalidatePath('/', 'layout')
  redirect('/')
}

export type SubmitState = { error?: string; ok?: boolean }
type UploadedFile = { pathname: string }

/**
 * 成果を提出する。ファイルはブラウザから Blob に送ったあとで、その場所だけを受け取る。
 * 出し直すと、ひとことも写真・PDF も差し替える。提出すると宣言は「達成」として報告済みになる。
 */
export async function submitResult(declId: string, input: { body: string; files: UploadedFile[] }): Promise<SubmitState> {
  const me = await requireMe()
  if (!isUuid(declId)) return { error: '宣言が見つかりません。' }
  const body = String(input?.body ?? '').trim().slice(0, 300)
  const list = Array.isArray(input?.files) ? input.files.slice(0, MAX_PHOTOS + 1) : []
  const prefix = uploadPrefix(me.id, declId)
  if (list.some((f) => typeof f?.pathname !== 'string' || !f.pathname.startsWith(prefix))) {
    return { error: 'ファイルの場所が正しくありません。もう一度選び直してください。' }
  }
  if (!body && list.length === 0) return { error: 'ひとことか、写真・PDF を入れてください。' }

  const sql = await db()
  const decl = (await sql`select status, what from declarations where id = ${declId} and member_id = ${me.id}`) as {
    status: string
    what: string
  }[]
  if (!decl[0]) return { error: '自分の宣言にだけ提出できます。' }

  // 実際に Blob に置かれた中身の種類と大きさを確かめる
  const files: { pathname: string; content_type: string; size: number }[] = []
  for (const f of list) {
    try {
      const h = await head(f.pathname)
      files.push({ pathname: f.pathname, content_type: h.contentType, size: h.size })
    } catch {
      return { error: 'アップロードが終わっていないファイルがあります。もう一度試してください。' }
    }
  }
  const photos = files.filter((f) => PHOTO_TYPES.includes(f.content_type))
  const pdfs = files.filter((f) => f.content_type === PDF_TYPE)
  if (photos.length + pdfs.length !== files.length || photos.length > MAX_PHOTOS || pdfs.length > 1) {
    return { error: `写真は${MAX_PHOTOS}枚まで、PDF は1つまでです。` }
  }

  const old = (await sql`select pathname from submission_files where decl_id = ${declId}`) as { pathname: string }[]
  await sql`
    insert into submissions (decl_id, member_id, body) values (${declId}, ${me.id}, ${body})
    on conflict (decl_id) do update set body = excluded.body, updated_at = now()
  `
  await sql`delete from submission_files where decl_id = ${declId}`
  const ordered = [...photos, ...pdfs]
  for (let i = 0; i < ordered.length; i++) {
    const f = ordered[i]
    await sql`
      insert into submission_files (decl_id, pathname, content_type, size, position)
      values (${declId}, ${f.pathname}, ${f.content_type}, ${f.size}, ${i})
    `
  }
  const keep = new Set(ordered.map((f) => f.pathname))
  after(() => deleteBlobs(old.map((o) => o.pathname).filter((p) => !keep.has(p))))

  const changed = (await sql`
    update declarations set status = 'done', reported_at = coalesce(reported_at, now())
    where id = ${declId} and member_id = ${me.id} and status = 'doing'
    returning what
  `) as { what: string }[]
  if (changed[0]) {
    const msgs = await saveMessages(me.id, [{ kind: 'done', decl_id: declId, body: say.done(changed[0].what) }])
    after(() => pushTo(me.id, msgs))
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

