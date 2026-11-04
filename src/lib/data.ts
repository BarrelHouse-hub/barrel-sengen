import 'server-only'
import { db } from './db'

export const CATS = [
  { id: 'work', label: '仕事' },
  { id: 'love', label: '恋愛' },
  { id: 'hobby', label: '趣味' },
  { id: 'trip', label: '旅' },
  { id: 'life', label: 'くらし' },
] as const
export type Cat = (typeof CATS)[number]['id']
export const CAT_LABEL: Record<string, string> = Object.fromEntries(CATS.map((c) => [c.id, c.label]))
export const isCat = (v: unknown): v is Cat => CATS.some((c) => c.id === v)

export type Status = 'doing' | 'done' | 'miss'

export type Decl = {
  id: string
  member_id: string
  name: string
  what: string
  due: string | null
  cat: Cat
  mode: 'gachi' | 'yuru'
  need: string
  status: Status
  cheer_count: number
  cheered: boolean
  help_count: number
  helped: boolean
  intro_count: number
  introed: boolean
  comment_count: number
}

export async function listDecls(meId: string): Promise<Decl[]> {
  const sql = await db()
  return (await sql`
    select d.id, d.member_id, m.name, d.what, to_char(d.due, 'YYYY-MM-DD') as due,
      d.cat, d.mode, d.need, d.status,
      (select count(*)::int from cheers c where c.decl_id = d.id) as cheer_count,
      exists(select 1 from cheers c where c.decl_id = d.id and c.member_id = ${meId}) as cheered,
      (select count(*)::int from offers o where o.decl_id = d.id and o.kind = 'help') as help_count,
      exists(select 1 from offers o where o.decl_id = d.id and o.kind = 'help' and o.member_id = ${meId}) as helped,
      (select count(*)::int from offers o where o.decl_id = d.id and o.kind = 'intro') as intro_count,
      exists(select 1 from offers o where o.decl_id = d.id and o.kind = 'intro' and o.member_id = ${meId}) as introed,
      (select count(*)::int from comments x where x.decl_id = d.id) as comment_count
    from declarations d join members m on m.id = d.member_id
    order by coalesce(d.reported_at, d.created_at) desc
    limit 300
  `) as Decl[]
}

export async function getDecl(meId: string, id: string): Promise<Decl | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const all = await listDecls(meId)
  return all.find((d) => d.id === id) ?? null
}

export async function listOffers(declId: string) {
  const sql = await db()
  return (await sql`
    select o.kind, m.name from offers o join members m on m.id = o.member_id
    where o.decl_id = ${declId} order by o.created_at
  `) as { kind: 'help' | 'intro'; name: string }[]
}

export async function listComments(declId: string) {
  const sql = await db()
  return (await sql`
    select x.id, x.body, m.name from comments x join members m on m.id = x.member_id
    where x.decl_id = ${declId} order by x.created_at
  `) as { id: string; body: string; name: string }[]
}

export function formatDue(due: string | null) {
  if (!due) return 'なし'
  const [y, m, d] = due.split('-').map(Number)
  const thisYear = new Date().getFullYear()
  return y === thisYear ? `${m}/${d}` : `${y}/${m}/${d}`
}
