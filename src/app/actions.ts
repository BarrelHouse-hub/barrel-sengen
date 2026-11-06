'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { getMe, makeToken, requireMe, SESSION_COOKIE } from '@/lib/session'
import { isPushEndpoint, notifyDeclOwner } from '@/lib/push'
import { isCat } from '@/lib/data'

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
    returning id
  `) as { id: string }[]
  ;(await cookies()).set(SESSION_COOKIE, makeToken(rows[0].id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  redirect('/')
}

export async function logout(form?: FormData) {
  const endpoint = form ? str(form, 'endpoint', 1000) : ''
  const me = endpoint ? await getMe() : null
  if (me) {
    const sql = await db()
    await sql`delete from push_subscriptions where endpoint = ${endpoint} and member_id = ${me.id}`
  }
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
  const sql = await db()
  await sql`
    insert into declarations (member_id, what, due, cat, mode, need)
    values (${me.id}, ${what}, ${due}, ${cat}, ${mode}, ${need})
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
    if (added.length > 0) {
      // 乾杯のやり直しで通知が積み重ならないよう、同じ tag でまとめる
      notifyDeclOwner(id, me, (what) => ({ title: `${me.name} さんが乾杯しました`, body: what, tag: `cheer-${id}-${me.id}` }))
    }
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
    if (added.length > 0) {
      const label = kind === 'intro' ? '知り合いを紹介' : '手伝える'
      notifyDeclOwner(id, me, (what) => ({
        title: `${me.name} さんが「${label}」と手を挙げました`,
        body: what,
        tag: `offer-${id}-${me.id}-${kind}`,
      }))
    }
  }
  revalidatePath('/', 'layout')
}

export async function addComment(form: FormData) {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  const body = str(form, 'body', 200)
  if (!isUuid(id) || !body) return
  const sql = await db()
  await sql`insert into comments (decl_id, member_id, body) values (${id}, ${me.id}, ${body})`
  notifyDeclOwner(id, me, () => ({ title: `${me.name} さんがコメントしました`, body }))
  revalidatePath('/', 'layout')
}

export async function setStatus(form: FormData) {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  const raw = str(form, 'status', 10)
  const status = raw === 'done' || raw === 'miss' ? raw : 'doing'
  if (!isUuid(id)) return
  const sql = await db()
  await sql`
    update declarations
    set status = ${status}, reported_at = case when ${status} = 'doing' then null else now() end
    where id = ${id} and member_id = ${me.id}
  `
  revalidatePath('/', 'layout')
}

export async function deleteDecl(form: FormData) {
  const me = await requireMe()
  const id = str(form, 'id', 36)
  if (!isUuid(id)) return
  const sql = await db()
  await sql`delete from declarations where id = ${id} and member_id = ${me.id}`
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function savePush(input: { endpoint: string; p256dh: string; auth: string }) {
  const me = await requireMe()
  const endpoint = String(input.endpoint ?? '')
  const p256dh = String(input.p256dh ?? '')
  const auth = String(input.auth ?? '')
  if (endpoint.length > 1000 || !isPushEndpoint(endpoint)) return false
  if (!p256dh || p256dh.length > 200 || !auth || auth.length > 100) return false
  const sql = await db()
  await sql`
    insert into push_subscriptions (endpoint, member_id, p256dh, auth)
    values (${endpoint}, ${me.id}, ${p256dh}, ${auth})
    on conflict (endpoint) do update set member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth
  `
  return true
}

export async function removePush(endpoint: string) {
  const me = await requireMe()
  const sql = await db()
  await sql`delete from push_subscriptions where endpoint = ${String(endpoint ?? '')} and member_id = ${me.id}`
}
