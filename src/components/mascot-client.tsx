'use client'

import { useEffect, useState } from 'react'
import { deletePushSubscription, markMascotRead, savePushSubscription } from '@/app/actions'

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

type State = 'checking' | 'unsupported' | 'off' | 'on' | 'denied' | 'busy' | 'error'

/** スマホに通知を送るかどうかの切り替え。 */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>('checking')

  useEffect(() => {
    let alive = true
    Promise.resolve()
      .then(async () => {
        if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
        const reg = await navigator.serviceWorker.register('/sw.js')
        const sub = await reg.pushManager.getSubscription()
        if (sub) return 'on'
        return Notification.permission === 'denied' ? 'denied' : 'off'
      })
      .then((s) => alive && setState(s as State))
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [publicKey])

  async function enable() {
    if (!publicKey) return
    setState('busy')
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return setState('denied')
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) })
      await savePushSubscription(sub.toJSON())
      setState('on')
    } catch {
      setState('error')
    }
  }

  async function disable() {
    setState('busy')
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

  const note: Record<State, string> = {
    checking: '確認しています…',
    unsupported: 'この端末やブラウザでは通知を受け取れません。iPhone は、ホーム画面に追加したアプリから開くと受け取れます。',
    off: 'オンにすると、お便りが届いたときにスマホに通知が来ます。',
    on: '通知はオンです。お便りが届いたらスマホに知らせます。',
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
        ) : state === 'off' || state === 'error' ? (
          <button type="button" onClick={enable} className="min-h-11 rounded-lg bg-accent px-4 text-sm font-bold text-ground">
            オンにする
          </button>
        ) : null}
      </div>
      <p className="text-xs leading-relaxed text-muted" aria-live="polite">
        {note[state]}
      </p>
    </section>
  )
}
