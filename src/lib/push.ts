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

/** ログに出すのはプッシュサービスの名前だけ（端末を特定できる URL 全体は出さない） */
const hostOf = (endpoint: string) => {
  try {
    return new URL(endpoint).hostname
  } catch {
    return '?'
  }
}

let configured: boolean | null = null

function configure() {
  if (configured !== null) return configured
  // 貼り付けたときの改行・空白が混じると鍵として読めないので落とす
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const priv = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!pub || !priv) {
    console.error('push: VAPID の鍵が設定されていません')
    return (configured = false)
  }
  try {
    webpush.setVapidDetails('https://barrel-sengen.vercel.app', pub, priv)
    return (configured = true)
  } catch (e) {
    console.error('push: VAPID の鍵が読めません', (e as Error).message)
    return (configured = false)
  }
}

export type PushPayload = { title: string; body: string; url: string }

export type PushResult = {
  /** 送れた端末の数 */
  sent: number
  /** 失敗した端末ごとの HTTP ステータス（0 は通信エラーなど） */
  failed: number[]
  /** 鍵が合わない・期限切れで消した購読の数 */
  removed: number
  /** 鍵が未設定でそもそも送れない */
  disabled?: boolean
}

/**
 * 購読が使えなくなったと判断するステータス。
 * 404/410: 端末側で購読が消えた。401/403: 送信に使った鍵と購読を作ったときの鍵が合わない（鍵を入れ替えたときなど）。
 */
const DEAD = new Set([401, 403, 404, 410])

/** その人の端末すべてに通知を送る。結果を返し、失敗はログに残す。 */
export async function sendPush(memberId: string, payload: PushPayload): Promise<PushResult> {
  if (!configure()) return { sent: 0, failed: [], removed: 0, disabled: true }
  const sql = await db()
  const subs = (await sql`
    select endpoint, p256dh, auth from push_subscriptions where member_id = ${memberId}
  `) as { endpoint: string; p256dh: string; auth: string }[]
  const result: PushResult = { sent: 0, failed: [], removed: 0 }
  const data = JSON.stringify(payload)
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data, {
          TTL: 60 * 60 * 24,
          urgency: 'high',
        })
        result.sent++
      } catch (e) {
        const err = e as { statusCode?: number; body?: string; message?: string }
        const code = err.statusCode ?? 0
        result.failed.push(code)
        console.error('push failed', {
          status: code,
          host: hostOf(s.endpoint),
          body: String(err.body ?? err.message ?? '').slice(0, 300),
        })
        if (DEAD.has(code)) {
          await sql`delete from push_subscriptions where endpoint = ${s.endpoint}`
          result.removed++
        }
      }
    }),
  )
  // 端末の通知が全部使えなくなったら、アプリの中のお便りで「オンにし直して」と伝える
  if (result.removed > 0) {
    const left = (await sql`select 1 from push_subscriptions where member_id = ${memberId} limit 1`) as unknown[]
    if (left.length === 0) {
      await sql`
        insert into mascot_messages (member_id, kind, decl_id, body)
        values (${memberId}, 'push_reset', null, ${PUSH_RESET_BODY})
      `
    }
  }
  return result
}

const PUSH_RESET_BODY =
  'スマホへの通知が届かへんようになってたみたい。ごめんな。このページの「スマホに通知する」で、もう一回オンにしてくれへん？'

/** その人が通知をオンにしている端末すべてに、お便りが届いたことを知らせる。 */
export async function pushTo(memberId: string, messages: Pick<MascotMessage, 'body'>[]) {
  if (messages.length === 0) return
  const body = messages.length === 1 ? messages[0].body : `${messages[0].body}（ほか${messages.length - 1}通）`
  await sendPush(memberId, { title: `${MASCOT_NAME}から`, body, url: '/mascot' })
}
