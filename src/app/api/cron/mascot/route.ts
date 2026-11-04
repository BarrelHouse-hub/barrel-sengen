import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { generateFor } from '@/lib/mascot'
import { pushTo } from '@/lib/push'

// Vercel Cron から毎日呼ばれる（vercel.json）。全員分のお便りを作り、通知をオンにしている人に送る。
export async function GET() {
  const secret = process.env.CRON_SECRET
  const auth = (await headers()).get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const sql = await db()
  const members = (await sql`select id from members`) as { id: string }[]
  let created = 0
  for (const m of members) {
    const msgs = await generateFor(m.id)
    created += msgs.length
    await pushTo(m.id, msgs)
  }
  return Response.json({ members: members.length, created })
}
