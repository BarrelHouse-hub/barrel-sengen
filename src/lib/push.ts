import 'server-only'
import { sendNotification, setVapidDetails } from 'web-push'
import { after } from 'next/server'
import { db } from './db'
import type { Me } from './session'

export type PushPayload = { title: string; body: string; url: string; tag?: string }
type Sub = { endpoint: string; p256dh: string; auth: string }

const PUSH_HOSTS = ['fcm.googleapis.com', '.push.services.mozilla.com', '.push.apple.com', '.notify.windows.com']

/** サーバーから任意の URL へ送らされないよう、ブラウザのプッシュサービスだけ通す */
export function isPushEndpoint(value: string) {
  try {
    const { protocol, hostname } = new URL(value)
    return protocol === 'https:' && PUSH_HOSTS.some((h) => (h.startsWith('.') ? hostname.endsWith(h) : hostname === h))
  } catch {
    return false
  }
}

function configured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  setVapidDetails(process.env.VAPID_SUBJECT || 'https://barrel-sengen.vercel.app', publicKey, privateKey)
  return true
}

async function pushTo(memberId: string, payload: PushPayload) {
  const sql = await db()
  const subs = (await sql`
    select endpoint, p256dh, auth from push_subscriptions where member_id = ${memberId}
  `) as Sub[]
  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        )
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          // 通知をやめた端末なので消す
          await sql`delete from push_subscriptions where endpoint = ${s.endpoint}`
        } else {
          console.error('プッシュ通知の送信に失敗', status)
        }
      }
    }),
  )
}

/** 宣言の持ち主に通知する。画面の応答は待たせず、自分の宣言への操作では送らない。 */
export function notifyDeclOwner(
  declId: string,
  actor: Me,
  build: (what: string) => Omit<PushPayload, 'url'>,
) {
  if (!configured()) return
  after(async () => {
    try {
      const sql = await db()
      const rows = (await sql`select member_id, what from declarations where id = ${declId}`) as {
        member_id: string
        what: string
      }[]
      const decl = rows[0]
      if (!decl || decl.member_id === actor.id) return
      await pushTo(decl.member_id, { ...build(decl.what), url: `/d/${declId}` })
    } catch (e) {
      console.error('プッシュ通知の準備に失敗', e)
    }
  })
}
