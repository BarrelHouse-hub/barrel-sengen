'use client'

import { useEffect, useState } from 'react'
import { deletePushSubscription, hasPushSubscription, markMascotRead, savePushSubscription, sendTestPush } from '@/app/actions'
import { isIos, isStandalone } from '@/lib/device'

/** 画面を開いたら未読を既読にする。 */
export function MarkRead({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (hasUnread) void markMascotRead()
  }, [hasUnread])
  return null
}

function toKey(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** 購読を作ったときの鍵と、今の鍵が同じか。分からない端末では null。 */
function sameKey(sub: PushSubscription, publicKey: string): boolean | null {
  const used = sub.options?.applicationServerKey
  if (!used) return null
  const a = new Uint8Array(used)
  const b = toKey(publicKey)
  return a.length === b.length && a.every((v, i) => v === b[i])
}

async function registration() {
  await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
  // 購読は動いている Service Worker が要る
  return navigator.serviceWorker.ready
}

type State = 'checking' | 'unsupported' | 'ios-browser' | 'off' | 'on' | 'stale' | 'denied' | 'busy' | 'error'

/** スマホに通知を送るかどうかの切り替え。 */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>('checking')
  const [ios, setIos] = useState(false)
  const [test, setTest] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.resolve()
      .then(async (): Promise<State> => {
        const onIos = isIos()
        if (alive) setIos(onIos)
        if (onIos && !isStandalone()) return 'ios-browser'
        if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
        const reg = await registration()
        const sub = await reg.pushManager.getSubscription()
        if (!sub) return Notification.permission === 'denied' ? 'denied' : 'off'
        const same = sameKey(sub, publicKey)
        // 鍵が入れ替わる前に作った購読は届かないので、オンにし直してもらう
        if (same === false) return 'stale'
        if (same === true) {
          // 鍵は合っているので、サーバー側に無ければ登録し直しておく
          await savePushSubscription(sub.toJSON())
          return 'on'
        }
        return (await hasPushSubscription(sub.endpoint)) ? 'on' : 'stale'
      })
      .then((s) => alive && setState(s))
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [publicKey])

  async function enable() {
    if (!publicKey) return
    setState('busy')
    setTest(null)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return setState('denied')
      const reg = await registration()
      const old = await reg.pushManager.getSubscription()
      if (old) {
        await deletePushSubscription(old.endpoint).catch(() => {})
        await old.unsubscribe()
      }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) })
      await savePushSubscription(sub.toJSON())
      setState('on')
    } catch {
      setState('error')
    }
  }

  async function disable() {
    setState('busy')
    setTest(null)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await deletePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setState('off')
    } catch {
      setState('error')
    }
  }

  async function sendTest() {
    setTest('送っています…')
    try {
      const r = await sendTestPush()
      if (r.disabled) setTest('サーバーの通知の設定がまだのようです。運営に知らせてください。')
      else if (r.sent > 0) setTest('送りました。数秒たっても届かないときは、端末の設定でこのアプリの通知が許可されているか確かめてください。')
      else if (r.removed > 0 || r.failed.length === 0) {
        setTest('この端末の通知の登録が古くなっていて、届きませんでした。もう一度オンにしてください。')
        setState('stale')
      } else setTest(`送れませんでした（エラー ${r.failed.join('・')}）。時間をおいて試すか、運営に知らせてください。`)
    } catch {
      setTest('送れませんでした。電波のよいところでもう一度試してください。')
    }
  }

  const note: Record<State, string> = {
    checking: '確認しています…',
    unsupported: 'この端末やブラウザでは通知を受け取れません。',
    'ios-browser':
      'iPhone は、ホーム画面に追加したアプリでだけ通知を受け取れます。Safari の共有ボタンから「ホーム画面に追加」を選び、ホーム画面のアイコンから開き直して、ここでオンにしてください。',
    off: 'オンにすると、お便りが届いたときにスマホに通知が来ます。',
    on: '通知はオンです。お便りが届いたらスマホに知らせます。',
    stale: '通知の設定が古くなっていて、いまは届きません。お手数ですが、もう一度オンにしてください。',
    denied: '通知がブロックされています。端末の設定でこのアプリの通知を許可してください。',
    busy: '設定しています…',
    error: 'うまく設定できませんでした。もう一度試してください。',
  }

  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">スマホに通知する</h2>
        {state === 'on' ? (
          <button type="button" onClick={disable} className="min-h-11 rounded-lg border border-paper-muted px-4 text-sm font-bold">
            オフにする
          </button>
        ) : state === 'off' || state === 'error' || state === 'stale' ? (
          <button type="button" onClick={enable} className="min-h-11 rounded-lg bg-accent px-4 text-sm font-bold text-ground">
            {state === 'stale' ? 'オンにし直す' : 'オンにする'}
          </button>
        ) : null}
      </div>
      <p className={`text-xs leading-relaxed ${state === 'stale' ? 'font-bold text-accent' : 'text-muted'}`} aria-live="polite">
        {note[state]}
      </p>
      {ios && state !== 'ios-browser' ? (
        <p className="text-xs leading-relaxed text-faint">iPhone は、ホーム画面に追加したアプリから開いたときだけ通知が届きます。</p>
      ) : null}
      {state === 'on' ? (
        <div className="flex flex-col gap-1.5 border-t border-line pt-2.5">
          <button type="button" onClick={sendTest} className="min-h-11 self-start rounded-lg border border-line px-4 text-sm font-bold">
            テスト通知を送る
          </button>
          <p className="text-xs leading-relaxed text-muted" aria-live="polite">
            {test ?? '自分の端末にだけ届きます。届くかどうかの確認に使ってください。'}
          </p>
        </div>
      ) : null}
    </section>
  )
}
