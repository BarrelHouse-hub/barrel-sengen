import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from './db'

export const SESSION_COOKIE = 'bh_session'

function secret() {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET が設定されていません')
  return s
}

function sign(id: string) {
  return createHmac('sha256', secret()).update(id).digest('base64url')
}

export function makeToken(memberId: string) {
  return `${memberId}.${sign(memberId)}`
}

function readToken(token: string | undefined): string | null {
  if (!token) return null
  const i = token.lastIndexOf('.')
  if (i <= 0) return null
  const id = token.slice(0, i)
  const a = Buffer.from(token.slice(i + 1))
  const b = Buffer.from(sign(id))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return id
}

export type Me = { id: string; name: string }

export async function getMe(): Promise<Me | null> {
  const id = readToken((await cookies()).get(SESSION_COOKIE)?.value)
  if (!id) return null
  const sql = await db()
  const rows = (await sql`select id, name from members where id = ${id}`) as Me[]
  return rows[0] ?? null
}

export async function requireMe(): Promise<Me> {
  const me = await getMe()
  if (!me) redirect('/join')
  return me
}
