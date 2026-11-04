import 'server-only'
import { db } from './db'
import { say, type MascotMessage } from './mascot'
import { pushTo } from './push'

export type Reaction = { kind: 'intro' | 'help' | 'cheer' } | { kind: 'comment'; body: string }

/**
 * 宣言した本人に、だれかが反応したことをたるまるのお便りで知らせる。
 * 自分の宣言への反応は知らせない。紹介・手伝える・乾杯は同じ人から1回だけ。乾杯はスマホ通知を送らない。
 * 失敗してもボタン操作には影響させない（呼び出し側は after() の中で呼ぶ）。
 */
export async function notifyReaction(declId: string, actorId: string, r: Reaction) {
  try {
    const sql = await db()
    const rows = (await sql`
      select d.member_id as owner_id, d.what, a.name as actor_name
      from declarations d, members a
      where d.id = ${declId} and a.id = ${actorId}
    `) as { owner_id: string; what: string; actor_name: string }[]
    const t = rows[0]
    if (!t || t.owner_id === actorId) return

    const body =
      r.kind === 'comment' ? say.comment(t.actor_name, t.what, r.body) : say[r.kind](t.actor_name, t.what)
    const saved = (await sql`
      insert into mascot_messages (member_id, kind, decl_id, body, actor_id)
      values (${t.owner_id}, ${r.kind}, ${declId}, ${body}, ${actorId})
      on conflict (member_id, decl_id, kind, actor_id) where kind in ('intro', 'help', 'cheer') do nothing
      returning id, kind, decl_id, body, created_at, read_at
    `) as MascotMessage[]
    if (saved.length > 0 && r.kind !== 'cheer') await pushTo(t.owner_id, saved)
  } catch (e) {
    console.error('notifyReaction failed', e)
  }
}
