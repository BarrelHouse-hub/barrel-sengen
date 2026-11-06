'use client'

import { useEffect, useState, useTransition } from 'react'
import { removePush, savePush } from '@/app/actions'
import { currentSubscription, isIos, isPushSupported, isStandalone, keyToBytes, VAPID_PUBLIC_KEY } from '@/lib/push-client'

type View = 'loading' | 'unsupported' | 'install' | 'denied' | 'off' | 'on'

export function NotifyToggle() {
  const [view, setView] = useState<View>('loading')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  useEffect(() => {
    let alive = true
    async function load(): Promise<View> {
      if (isIos() && !isStandalone()) return 'install'
      if (!isPushSupported()) return 'unsupported'
      if (Notification.permission === 'denied') return 'denied'
      return (await currentSubscription()) ? 'on' : 'off'
    }
    load()
      .catch((): View => 'unsupported')
      .then((v) => {
        if (alive) setView(v)
      })
    return () => {
      alive = false
    }
  }, [])

  function turnOn() {
    start(async () => {
      setError('')
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setView(permission === 'denied' ? 'denied' : 'off')
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY),
        })
        const json = sub.toJSON()
        const saved = await savePush({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
        })
        if (!saved) {
          await sub.unsubscribe()
          setError('この端末では通知を設定できませんでした。')
          return
        }
        setView('on')
      } catch (e) {
        console.error(e)
        setError('通知をオンにできませんでした。もう一度試してください。')
      }
    })
  }

  function turnOff() {
    start(async () => {
      setError('')
      try {
        const sub = await currentSubscription()
        if (sub) {
          await removePush(sub.endpoint)
          await sub.unsubscribe()
        }
        setView('off')
      } catch (e) {
        console.error(e)
        setError('通知をオフにできませんでした。もう一度試してください。')
      }
    })
  }

  if (!VAPID_PUBLIC_KEY || view === 'loading') return null

  return (
    <section className="mt-6 flex flex-col gap-2 rounded-lg border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold">通知</div>
        {view === 'on' || view === 'off' ? (
          <button
            type="button"
            onClick={view === 'on' ? turnOff : turnOn}
            disabled={pending}
            className={`min-h-11 rounded-lg px-4 text-sm font-bold disabled:opacity-60 ${view === 'on' ? 'border border-line2 text-ink' : 'bg-accent text-ground'}`}
          >
            {view === 'on' ? 'オフにする' : 'オンにする'}
          </button>
        ) : null}
      </div>
      <p className="text-xs leading-relaxed text-muted">
        {view === 'on' && '自分の宣言に乾杯・手を挙げる・コメントがあると、この端末に届きます。'}
        {view === 'off' && '自分の宣言に乾杯・手を挙げる・コメントがあったら、この端末に知らせます。'}
        {view === 'install' && 'iPhone では、ホーム画面に追加して開くと通知をオンにできます。'}
        {view === 'denied' && '通知がブロックされています。端末の設定から、このアプリの通知を許可してください。'}
        {view === 'unsupported' && 'このブラウザは通知に対応していません。'}
      </p>
      {error ? <p role="alert" className="text-xs text-stamp">{error}</p> : null}
    </section>
  )
}
