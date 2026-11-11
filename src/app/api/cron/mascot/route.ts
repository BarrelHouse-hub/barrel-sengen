import { headers } from 'next/headers'
import { generateFor, type MascotMessage } from '@/lib/mascot'
import { pushTo } from '@/lib/push'
import { audience, roundReminders } from '@/lib/rounds'

// Vercel Cron から毎日呼ばれる（vercel.json）。全員分のお便りとラウンドのリマインドを作り、
// 通知をオンにしている人には1人1回だけまとめて送る。
// 本番以外（手元・プレビュー）では「テスト」で始まる会員だけが対象（DB を本番と共有しているため）。
export async function GET() {
  const secret = process.env.CRON_SECRET
  const auth = (await headers()).get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const members = await audience()
  const byMember = await roundReminders(members)
  const rounds = [...byMember.values()].reduce((n, xs) => n + xs.length, 0)
  let created = 0
  for (const id of members) {
    const msgs: MascotMessage[] = [...(byMember.get(id) ?? []), ...(await generateFor(id))]
    created += msgs.length
    await pushTo(id, msgs)
  }
  return Response.json({ members: members.length, created, rounds })
}
