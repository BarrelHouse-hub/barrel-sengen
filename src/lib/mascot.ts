import 'server-only'
import { db } from './db'
import { CAT_LABEL } from './data'
import { MASCOT_NAME } from './mascot-name'

/** バレルハウスのマスコット（仮）「たるまる」。樽の子。関西弁でゆるく応援する。 */
export { MASCOT_NAME }

export type MascotKind =
  | 'welcome'
  | 'progress'
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
}

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

  // 1. 自分の挑戦中の宣言について、1通だけ（期限切れ > 期限間近 > 進捗どう？の順）
  const decls = (await sql`
    select d.id, d.what, to_char(d.due, 'YYYY-MM-DD') as due,
      d.created_at < now() - interval '3 days' as settled,
      exists(select 1 from mascot_messages x where x.decl_id = d.id and x.member_id = ${memberId} and x.kind = 'overdue') as told_overdue,
      exists(select 1 from mascot_messages x where x.decl_id = d.id and x.member_id = ${memberId} and x.kind = 'due_soon') as told_due_soon,
      coalesce((
        select max(x.created_at) from mascot_messages x
        where x.decl_id = d.id and x.member_id = ${memberId} and x.kind in ('progress', 'due_soon', 'overdue')
      ) < now() - interval '7 days', true) as progress_ok
    from declarations d
    where d.member_id = ${memberId} and d.status = 'doing'
    order by d.created_at
  `) as {
    id: string
    what: string
    due: string | null
    settled: boolean
    told_overdue: boolean
    told_due_soon: boolean
    progress_ok: boolean
  }[]

  const overdue = decls.find((d) => d.due && daysUntil(d.due) < 0 && !d.told_overdue)
  const soon = decls.find((d) => d.due && daysUntil(d.due) >= 0 && daysUntil(d.due) <= 3 && !d.told_due_soon)
  const quiet = decls.find((d) => d.settled && d.progress_ok)
  if (overdue) out.push({ kind: 'overdue', decl_id: overdue.id, body: say.overdue(overdue.what) })
  else if (soon) out.push({ kind: 'due_soon', decl_id: soon.id, body: say.dueSoon(soon.what, daysUntil(soon.due!)) })
  else if (quiet) out.push({ kind: 'progress', decl_id: quiet.id, body: say.progress(quiet.what) })

  // 2. 好みに合う、ほかの人の宣言を紹介（3日に1通まで）
  const [{ recommend_ok, has_any }] = (await sql`
    select
      coalesce((select max(created_at) from mascot_messages where member_id = ${memberId} and kind = 'recommend') < now() - interval '3 days', true) as recommend_ok,
      exists(select 1 from declarations where member_id = ${memberId}) as has_any
  `) as { recommend_ok: boolean; has_any: boolean }[]

  if (recommend_ok) {
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

export async function saveMessages(memberId: string, msgs: NewMsg[]): Promise<MascotMessage[]> {
  if (msgs.length === 0) return []
  const sql = await db()
  const saved: MascotMessage[] = []
  for (const m of msgs) {
    const rows = (await sql`
      insert into mascot_messages (member_id, kind, decl_id, body)
      values (${memberId}, ${m.kind}, ${m.decl_id}, ${m.body})
      returning id, kind, decl_id, body, created_at, read_at
    `) as MascotMessage[]
    saved.push(rows[0])
  }
  return saved
}

export async function listMessages(memberId: string) {
  const sql = await db()
  return (await sql`
    select id, kind, decl_id, body, created_at, read_at from mascot_messages
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
