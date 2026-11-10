import 'server-only'
import { db } from './db'
import type { MascotMessage } from './mascot'

/**
 * 2週間サイクル（ラウンド）。
 * 運営がラウンドを作り、宣言をひも付け、締め切りまでに成果を報告する。報告会で集まる。
 */
export type Round = {
  id: string
  name: string
  /** 締め切り日（この日の終わりまで）YYYY-MM-DD */
  deadline: string
  meetup_at: string | null
  meetup_place: string
  meetup_map_url: string
  note: string
}

export function todayJst() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function addMonths(ymd: string, n: number) {
  const [y, m, d] = ymd.split('-').map(Number)
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m - 1 + n, Math.min(d, last))).toISOString().slice(0, 10)
}

/** 今日から締め切りまでの日数（今日が締め切りなら 0、過ぎたらマイナス） */
export function daysLeft(deadline: string) {
  return Math.round((Date.parse(deadline) - Date.parse(todayJst())) / 86_400_000)
}

const WEEK = ['日', '月', '火', '水', '木', '金', '土']

export function formatDate(ymd: string) {
  const [, m, d] = ymd.split('-').map(Number)
  return `${m}/${d}（${WEEK[new Date(`${ymd}T00:00:00Z`).getUTCDay()]}）`
}

export function formatMeetup(iso: string) {
  const ymd = new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const hm = new Date(iso).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
  return `${formatDate(ymd)} ${hm}`
}

/**
 * 本番以外（手元・プレビュー）は DB を本番と共有しているので、
 * 全員向けの通知は「テスト」で始まる会員だけに絞る。テスト用のラウンドも本番には出さない。
 */
const isProduction = () => process.env.VERCEL_ENV === 'production'

/** 全員向けのお知らせを届ける相手 */
export async function audience(): Promise<string[]> {
  const sql = await db()
  const rows = (isProduction()
    ? await sql`select id from members`
    : await sql`select id from members where name like 'テスト%'`) as { id: string }[]
  return rows.map((r) => r.id)
}

/** 運営かどうか。members.is_admin か、環境変数 BARREL_ADMINS（ニックネームをカンマ区切り）で決める */
export async function isAdmin(memberId: string) {
  const sql = await db()
  const rows = (await sql`select name, is_admin from members where id = ${memberId}`) as { name: string; is_admin: boolean }[]
  const m = rows[0]
  if (!m) return false
  if (m.is_admin) return true
  const names = (process.env.BARREL_ADMINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return names.includes(m.name)
}


/**
 * 今のラウンド: 締め切りか報告会がまだ来ていないラウンドのうち、いちばん新しく作ったもの。
 */
export async function currentRound(): Promise<Round | null> {
  const sql = await db()
  const today = todayJst()
  const rows = (await sql`
    select id, name, to_char(deadline, 'YYYY-MM-DD') as deadline, meetup_at, meetup_place, meetup_map_url, note
    from rounds
    where greatest(deadline, coalesce((meetup_at at time zone 'Asia/Tokyo')::date, deadline)) >= ${today}::date
      and (${isProduction()} = false or name not like 'テスト%')
    order by created_at desc
    limit 1
  `) as Round[]
  return rows[0] ?? null
}

/** 宣言をひも付けられるラウンド（締め切り前のもの） */
export async function openRounds(): Promise<Round[]> {
  const sql = await db()
  return (await sql`
    select id, name, to_char(deadline, 'YYYY-MM-DD') as deadline, meetup_at, meetup_place, meetup_map_url, note
    from rounds
    where deadline >= ${todayJst()}::date
      and (${isProduction()} = false or name not like 'テスト%')
    order by created_at desc
  `) as Round[]
}

export type RoundStatus = {
  /** このラウンドに宣言している人数 */
  members: number
  /** そのうち、ラウンドの宣言を全部報告した人数 */
  submitted: number
  /** 自分の宣言の数・報告済みの数 */
  mine: { total: number; reported: number }
}

export async function roundStatus(roundId: string, meId: string): Promise<RoundStatus> {
  const sql = await db()
  const rows = (await sql`
    with per as (
      select member_id, count(*)::int as total, count(*) filter (where status <> 'doing')::int as reported
      from declarations where round_id = ${roundId} group by member_id
    )
    select
      (select count(*)::int from per) as members,
      (select count(*)::int from per where reported = total) as submitted,
      coalesce((select total from per where member_id = ${meId}), 0) as my_total,
      coalesce((select reported from per where member_id = ${meId}), 0) as my_reported
  `) as { members: number; submitted: number; my_total: number; my_reported: number }[]
  const r = rows[0]
  return { members: r.members, submitted: r.submitted, mine: { total: r.my_total, reported: r.my_reported } }
}

export const sayRound = {
  start: (r: Round) =>
    `新しいラウンド「${r.name}」が始まったで！締め切りは${formatDate(r.deadline)}。${
      r.meetup_at ? `報告会は${formatMeetup(r.meetup_at)}${r.meetup_place ? `、${r.meetup_place}` : ''}。` : ''
    }やりたいこと、ひとつ宣言してみよか。`,
  due: (r: Round, days: number, what: string) =>
    days === 0
      ? `「${r.name}」の締め切り、今日やで。「${what}」の成果、提出してな。途中まででも大丈夫。`
      : `「${r.name}」の締め切りまであと${days}日。「${what}」の成果、提出の準備しとこな。`,
  meetup: (r: Round) =>
    `明日は「${r.name}」の報告会やで。${r.meetup_at ? formatMeetup(r.meetup_at) : ''}${
      r.meetup_place ? `、${r.meetup_place}` : ''
    }。一杯やりながら聞かせてな。`,
}

export type RoundKind = 'round_start' | 'round_due3' | 'round_due1' | 'round_due0' | 'round_meetup'

/** ラウンドのお知らせを保存する。同じ人・同じラウンド・同じ種類は1回だけ（2回目は何も返さない）。 */
async function saveRoundMessage(memberId: string, roundId: string, kind: RoundKind, body: string, declId: string | null = null) {
  const sql = await db()
  return (await sql`
    insert into mascot_messages (member_id, kind, decl_id, body, round_id)
    values (${memberId}, ${kind}, ${declId}, ${body}, ${roundId})
    on conflict (member_id, round_id, kind) where round_id is not null do nothing
    returning id, kind, decl_id, body, created_at, read_at
  `) as MascotMessage[]
}

/** ラウンドを作ったときの告知。届けた相手ごとのお便りを返す（プッシュは呼び出し側で）。 */
export async function announceRound(round: Round) {
  const out = new Map<string, MascotMessage[]>()
  for (const id of await audience()) {
    const saved = await saveRoundMessage(id, round.id, 'round_start', sayRound.start(round))
    if (saved.length > 0) out.set(id, saved)
  }
  return out
}

/**
 * 毎日の定期実行で呼ぶ。締め切り3日前・前日・当日に、まだ報告していない宣言がある人へ。
 * 報告会の前日には全員へ。届けた相手ごとのお便りを返す。
 */
export async function roundReminders(targets: string[]) {
  const sql = await db()
  const out = new Map<string, MascotMessage[]>()
  const add = (id: string, msgs: MascotMessage[]) => {
    if (msgs.length > 0) out.set(id, [...(out.get(id) ?? []), ...msgs])
  }
  const allowed = new Set(targets)
  const today = todayJst()
  const tomorrow = addDays(today, 1)

  const due = (await sql`
    select id, name, to_char(deadline, 'YYYY-MM-DD') as deadline, meetup_at, meetup_place, meetup_map_url, note
    from rounds where deadline in (${today}::date, ${addDays(today, 1)}::date, ${addDays(today, 3)}::date)
      and (${isProduction()} = false or name not like 'テスト%')
  `) as Round[]
  for (const r of due) {
    const days = daysLeft(r.deadline)
    const kind: RoundKind = days === 0 ? 'round_due0' : days === 1 ? 'round_due1' : 'round_due3'
    const pending = (await sql`
      select distinct on (member_id) member_id, id, what from declarations
      where round_id = ${r.id} and status = 'doing'
      order by member_id, created_at
    `) as { member_id: string; id: string; what: string }[]
    for (const p of pending) {
      if (!allowed.has(p.member_id)) continue
      add(p.member_id, await saveRoundMessage(p.member_id, r.id, kind, sayRound.due(r, days, p.what), p.id))
    }
  }

  const meetups = (await sql`
    select id, name, to_char(deadline, 'YYYY-MM-DD') as deadline, meetup_at, meetup_place, meetup_map_url, note
    from rounds where (meetup_at at time zone 'Asia/Tokyo')::date = ${tomorrow}::date
      and (${isProduction()} = false or name not like 'テスト%')
  `) as Round[]
  for (const r of meetups) {
    for (const id of targets) add(id, await saveRoundMessage(id, r.id, 'round_meetup', sayRound.meetup(r)))
  }
  return out
}

