import 'server-only'
import { db } from './db'
import { CAT_LABEL } from './data'
import { MASCOT_NAME } from './mascot-name'
import { suggestStep, withStep, type Feeling } from './suggest'

/** バレルハウスのマスコット（仮）「たるまる」。樽の子。関西弁でゆるく応援する。 */
export { MASCOT_NAME }

export type MascotKind =
  | 'welcome'
  | 'progress'
  // 定期の「調子どう？」と、その返事へのお返し
  | 'checkin'
  | 'checkin_reply'
  | 'due_soon'
  | 'overdue'
  | 'done'
  | 'recommend'
  | 'nudge'
  // 自分の宣言にだれかが反応したお知らせ
  | 'intro'
  | 'help'
  | 'comment'
  | 'cheer'
  // スマホ通知が使えなくなったので、オンにし直してほしい
  | 'push_reset'
  // ラウンド（2週間サイクル）の告知・リマインド
  | 'round_start'
  | 'round_due3'
  | 'round_due1'
  | 'round_due0'
  | 'round_meetup'

export type MascotMessage = {
  id: string
  kind: MascotKind
  decl_id: string | null
  body: string
  created_at: string
  read_at: string | null
  reply?: Feeling | null
}

/** 声かけの頻度。more: 3日おき / normal: 週1 / less: 期限の知らせだけ */
export type CheckinFreq = 'more' | 'normal' | 'less'
export const isCheckinFreq = (v: unknown): v is CheckinFreq => v === 'more' || v === 'normal' || v === 'less'
const FREQ_DAYS: Record<CheckinFreq, number | null> = { more: 3, normal: 7, less: null }

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

export const say = {
  welcome: (name: string) =>
    `${name}さん、いらっしゃい。${MASCOT_NAME}やで。宣言したら、ときどき様子を聞きにくるな。急かしはせえへんから安心してや。`,
  progress: (what: string) =>
    pick([
      `「${what}」、進捗どう？急かしてるんちゃうで、ちょっと気になっただけ。`,
      `「${what}」、最近どんな感じ？一歩でも進んでたら、次の報告会で聞かせてな。`,
      `「${what}」のこと、ちゃんと覚えてるで。止まってても大丈夫。今日ひとつだけやってみよか。`,
      `「${what}」、困ってることあったら「貸してほしい力」に書いてみ。手挙げてくれる人、おるかもしれへんで。`,
    ]),
  checkin: (what: string) =>
    pick([
      `「${what}」、調子どう？お便りのボタンでひとこと教えてな。返事せんでも大丈夫やで。`,
      `ちょっと様子見にきたで。「${what}」、どんな感じ？`,
      `最近どう？「${what}」のこと、気が向いたら教えてな。`,
    ]),
  checkinReply: (feeling: Feeling) =>
    feeling === 'good'
      ? pick([`ええやん！その調子や。次の報告会、楽しみにしてるで。`, `順調なん、聞けてうれしいわ。このまま行こ！`])
      : feeling === 'stuck'
        ? pick([`止まることもあるって。ほな、ちょっとだけ提案な。`, `教えてくれてありがとう。止まってるときは、小さく動くのがコツやで。`])
        : pick([`しんどいの、言うてくれてありがとう。無理せんでええで。`, `しんどいときは、ちょっと力抜こか。責めたりせえへんから。`]),
  dueSoon: (what: string, days: number) =>
    days === 0
      ? `「${what}」、今日が期限やで。どっちに転んでも、報告したらみんなで乾杯や。`
      : `「${what}」の期限まであと${days}日。ラストスパート、応援してるで。`,
  overdue: (what: string) =>
    `「${what}」の期限きたで。できてもできんでも、報告したらそれで一歩や。「なんでできなかったんだろうね会」もあるしな。`,
  done: (what: string) =>
    pick([
      `「${what}」達成おめでとう！次の報告会、一杯目はこれで決まりやな。`,
      `やったな！「${what}」達成や。達成旅行のメンバー入り、おめでとう。`,
      `「${what}」、ほんまにやりきったな。次は何を宣言する？`,
    ]),
  recommend: (name: string, what: string, cat: string, need: string) =>
    need
      ? `${cat}が好きなあなたに。${name}さんの「${what}」、「${need}」を探してるみたいやで。力になれそうなら手挙げてみ。`
      : `${cat}が好きなあなたに。${name}さんの「${what}」、乾杯で応援してみぃひん？`,
  nudge: () => `まだ宣言がないみたい。仕事でも趣味でも恋愛でも、ひとつ書いてみぃひん？小さいことでええねん。`,
  intro: (name: string, what: string) =>
    `${name}さんが「${what}」に、知り合いを紹介できるって手を挙げてくれたで！詳しく聞いてみ。`,
  help: (name: string, what: string) =>
    `${name}さんが「${what}」に、手伝えるって手を挙げてくれたで！心強いなあ。声かけてみ。`,
  comment: (name: string, what: string, body: string) =>
    `${name}さんが「${what}」にコメントしてくれたで。「${body.length > 30 ? `${body.slice(0, 30)}…` : body}」`,
  cheer: (name: string, what: string) => `${name}さんが「${what}」に乾杯してくれたで！応援してくれる人がおるって、ええなあ。`,
}

type NewMsg = { kind: MascotKind; decl_id: string | null; body: string }

function todayJst() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

function daysUntil(due: string) {
  return Math.round((Date.parse(due) - Date.parse(todayJst())) / 86_400_000)
}

/**
 * その人に今届けるべきお便りを作って保存する。
 * 前回から20時間たっていなければ何もしない（アプリを開いたときと毎日の定期実行の両方から呼ぶ）。
 */
export async function generateFor(memberId: string): Promise<MascotMessage[]> {
  const sql = await db()
  const claimed = (await sql`
    update members set mascot_checked_at = now()
    where id = ${memberId}
      and (mascot_checked_at is null or mascot_checked_at < now() - interval '20 hours')
    returning id
  `) as unknown[]
  if (claimed.length === 0) return []

  const out: NewMsg[] = []

  const [{ freq: freqRaw }] = (await sql`select checkin_freq as freq from members where id = ${memberId}`) as { freq: string }[]
  const freq: CheckinFreq = isCheckinFreq(freqRaw) ? freqRaw : 'normal'

  // 1. 自分の挑戦中の宣言について、1通だけ（期限切れ > 期限間近 > 定期の声かけの順）
  const decls = (await sql`
    select d.id, d.what, d.cat, to_char(d.due, 'YYYY-MM-DD') as due,
      d.created_at < now() - interval '3 days' as settled,
      exists(select 1 from mascot_messages x where x.decl_id = d.id and x.member_id = ${memberId} and x.kind = 'overdue') as told_overdue,
      exists(select 1 from mascot_messages x where x.decl_id = d.id and x.member_id = ${memberId} and x.kind = 'due_soon') as told_due_soon,
      (
        select max(x.created_at) from mascot_messages x
        where x.decl_id = d.id and x.member_id = ${memberId} and x.kind in ('progress', 'checkin', 'due_soon', 'overdue')
      ) as last_touch
    from declarations d
    where d.member_id = ${memberId} and d.status = 'doing'
    order by d.created_at
  `) as {
    id: string
    what: string
    cat: string
    due: string | null
    settled: boolean
    told_overdue: boolean
    told_due_soon: boolean
    last_touch: string | null
  }[]

  const overdue = decls.find((d) => d.due && daysUntil(d.due) < 0 && !d.told_overdue)
  const soon = decls.find((d) => d.due && daysUntil(d.due) >= 0 && daysUntil(d.due) <= 3 && !d.told_due_soon)
  if (overdue) out.push({ kind: 'overdue', decl_id: overdue.id, body: say.overdue(overdue.what) })
  else if (soon) out.push({ kind: 'due_soon', decl_id: soon.id, body: say.dueSoon(soon.what, daysUntil(soon.due!)) })
  else {
    const periodic = await nextPeriodic(memberId, freq)
    // 声をかける宣言は、いちばん長く声をかけていないもの
    const quiet = decls
      .filter((d) => d.settled)
      .sort((a, b) => (a.last_touch ? Date.parse(a.last_touch) : 0) - (b.last_touch ? Date.parse(b.last_touch) : 0))[0]
    if (periodic && quiet) {
      if (periodic === 'checkin') {
        out.push({ kind: 'checkin', decl_id: quiet.id, body: say.checkin(quiet.what) })
      } else {
        // 進捗確認には「次の一歩」の提案を添える（最近届けた文は避ける）
        const step = suggestStep({ cat: quiet.cat, daysLeft: quiet.due ? daysUntil(quiet.due) : null }, await recentBodies(memberId))
        out.push({ kind: 'progress', decl_id: quiet.id, body: withStep(say.progress(quiet.what), step) })
      }
    }
  }

  // 2. 好みに合う、ほかの人の宣言を紹介（3日に1通まで）
  const [{ recommend_ok, has_any }] = (await sql`
    select
      coalesce((select max(created_at) from mascot_messages where member_id = ${memberId} and kind = 'recommend') < now() - interval '3 days', true) as recommend_ok,
      exists(select 1 from declarations where member_id = ${memberId}) as has_any
  `) as { recommend_ok: boolean; has_any: boolean }[]

  if (recommend_ok && freq !== 'less') {
    const rec = (await sql`
      with interests as (
        select cat from declarations where member_id = ${memberId}
        union select d.cat from cheers c join declarations d on d.id = c.decl_id where c.member_id = ${memberId}
        union select d.cat from offers o join declarations d on d.id = o.decl_id where o.member_id = ${memberId}
      )
      select d.id, d.what, d.cat, d.need, m.name
      from declarations d join members m on m.id = d.member_id
      where d.status = 'doing' and d.member_id <> ${memberId}
        and d.cat in (select cat from interests)
        and not exists (select 1 from cheers c where c.decl_id = d.id and c.member_id = ${memberId})
        and not exists (select 1 from offers o where o.decl_id = d.id and o.member_id = ${memberId})
        and not exists (select 1 from mascot_messages x where x.member_id = ${memberId} and x.decl_id = d.id and x.kind = 'recommend')
      order by (d.need <> '') desc, d.created_at desc
      limit 1
    `) as { id: string; what: string; cat: string; need: string; name: string }[]
    if (rec[0]) {
      const r = rec[0]
      out.push({ kind: 'recommend', decl_id: r.id, body: say.recommend(r.name, r.what, CAT_LABEL[r.cat] ?? r.cat, r.need) })
    }
  }

  // 3. まだ何も宣言していない人に、週1でひと声
  if (!has_any) {
    const [{ nudge_ok }] = (await sql`
      select coalesce(max(created_at) < now() - interval '7 days', true) as nudge_ok
      from mascot_messages where member_id = ${memberId} and kind in ('nudge', 'welcome')
    `) as { nudge_ok: boolean }[]
    if (nudge_ok) out.push({ kind: 'nudge', decl_id: null, body: say.nudge() })
  }

  return saveMessages(memberId, out)
}

/**
 * 定期の声かけを今送るなら、その種類。送らないなら null。
 * - 頻度の日数（3日 / 7日）がたつまでは、期限の知らせも含めて次の声かけをしない
 * - 前回の「調子どう？」に返事がなければ、間を倍あける（うざくならないように）
 * - 「調子どう？」と「進捗どう？＋次の一歩」を交互に送る
 */
async function nextPeriodic(memberId: string, freq: CheckinFreq): Promise<'checkin' | 'progress' | null> {
  const days = FREQ_DAYS[freq]
  if (days === null) return null
  const sql = await db()
  const [last] = (await sql`
    select kind, reply, extract(epoch from now() - created_at) / 86400 as days_ago
    from mascot_messages
    where member_id = ${memberId} and kind in ('progress', 'checkin', 'due_soon', 'overdue')
    order by created_at desc limit 1
  `) as { kind: string; reply: string | null; days_ago: number }[]
  if (last) {
    const wait = last.kind === 'checkin' && !last.reply ? days * 2 : days
    // 毎日 19:00 の定期実行が少し前後しても1日ずれないよう、半日の余裕をみる
    if (Number(last.days_ago) < wait - 0.5) return null
  }
  const [lastPeriodic] = (await sql`
    select kind from mascot_messages
    where member_id = ${memberId} and kind in ('progress', 'checkin')
    order by created_at desc limit 1
  `) as { kind: string }[]
  return lastPeriodic?.kind === 'checkin' ? 'progress' : 'checkin'
}

/** 「調子どう？」に返事をする。記録して、たるまるのお返し（止まってる・しんどいなら次の一歩つき）を返す */
export async function replyCheckin(memberId: string, messageId: string, feeling: Feeling): Promise<MascotMessage[]> {
  const sql = await db()
  const rows = (await sql`
    update mascot_messages set reply = ${feeling}, replied_at = now()
    where id = ${messageId} and member_id = ${memberId} and kind = 'checkin' and reply is null
    returning decl_id
  `) as { decl_id: string | null }[]
  if (!rows[0]) return []
  let body = say.checkinReply(feeling)
  const declId = rows[0].decl_id
  if (feeling !== 'good' && declId) {
    const d = (await sql`
      select cat, to_char(due, 'YYYY-MM-DD') as due from declarations where id = ${declId} and member_id = ${memberId}
    `) as { cat: string; due: string | null }[]
    if (d[0]) {
      const step = suggestStep({ cat: d[0].cat, daysLeft: d[0].due ? daysUntil(d[0].due) : null, feeling }, await recentBodies(memberId))
      body = withStep(body, step)
    }
  }
  const saved = await saveMessages(memberId, [{ kind: 'checkin_reply', decl_id: declId, body }])
  // 返事したその場で読むので、既読にしておく（ボードの「新着」に出さない）
  await sql`update mascot_messages set read_at = now() where id = ${saved[0].id}`
  return saved.map((m) => ({ ...m, read_at: new Date().toISOString() }))
}

export async function getCheckinFreq(memberId: string): Promise<CheckinFreq> {
  const sql = await db()
  const rows = (await sql`select checkin_freq as freq from members where id = ${memberId}`) as { freq: string }[]
  return isCheckinFreq(rows[0]?.freq) ? rows[0].freq : 'normal'
}

/** 最近そのひとに届けたお便りの本文（同じ提案が続かないようにするため） */
export async function recentBodies(memberId: string): Promise<string[]> {
  const sql = await db()
  const rows = (await sql`
    select body from mascot_messages where member_id = ${memberId} order by created_at desc limit 10
  `) as { body: string }[]
  return rows.map((r) => r.body)
}

export async function saveMessages(memberId: string, msgs: NewMsg[]): Promise<MascotMessage[]> {
  if (msgs.length === 0) return []
  const sql = await db()
  const saved: MascotMessage[] = []
  for (const m of msgs) {
    const rows = (await sql`
      insert into mascot_messages (member_id, kind, decl_id, body)
      values (${memberId}, ${m.kind}, ${m.decl_id}, ${m.body})
      returning id, kind, decl_id, body, created_at, read_at, reply
    `) as MascotMessage[]
    saved.push(rows[0])
  }
  return saved
}

export async function listMessages(memberId: string) {
  const sql = await db()
  return (await sql`
    select id, kind, decl_id, body, created_at, read_at, reply from mascot_messages
    where member_id = ${memberId} order by created_at desc limit 50
  `) as MascotMessage[]
}

export async function unreadSummary(memberId: string) {
  const sql = await db()
  const rows = (await sql`
    select id, kind, decl_id, body, created_at, read_at,
      count(*) over ()::int as total
    from mascot_messages where member_id = ${memberId} and read_at is null
    order by created_at desc limit 1
  `) as (MascotMessage & { total: number })[]
  return { latest: rows[0] ?? null, count: rows[0]?.total ?? 0 }
}
