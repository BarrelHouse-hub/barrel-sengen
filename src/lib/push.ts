import 'server-only'
import webpush from 'web-push'
import { db } from './db'
import { MASCOT_NAME, type MascotMessage } from './mascot'

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

let configured: boolean | null = null

function configure() {
  if (configured !== null) return configured
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return (configured = false)
  webpush.setVapidDetails('https://barrel-sengen.vercel.app', pub, priv)
  return (configured = true)
}

/** その人が通知をオンにしている端末すべてに、お便りが届いたことを知らせる。 */
export async function pushTo(memberId: string, messages: Pick<MascotMessage, 'body'>[]) {
  if (messages.length === 0 || !configure()) return
  const sql = await db()
  const subs = (await sql`
    select endpoint, p256dh, auth from push_subscriptions where member_id = ${memberId}
  `) as { endpoint: string; p256dh: string; auth: string }[]
  const body = messages.length === 1 ? messages[0].body : `${messages[0].body}（ほか${messages.length - 1}通）`
  const payload = JSON.stringify({ title: `${MASCOT_NAME}から`, body, url: '/mascot' })
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await sql`delete from push_subscriptions where endpoint = ${s.endpoint}`
        else console.error('push failed', code)
      }
    }),
  )
}
