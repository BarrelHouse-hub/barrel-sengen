'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { isIos, isStandalone } from '@/lib/device'

const DISMISS_KEY = 'bh_install_dismissed'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
type Device = 'hidden' | 'ios' | 'ios-inapp' | 'android' | 'android-inapp'

function readDevice(): Device {
  try {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return 'hidden'
  } catch {
    // 保存できない環境では毎回表示する
  }
  const ua = navigator.userAgent
  const inApp = /\bLine\/|FBAN|FBAV|Instagram/i.test(ua)
  if (isIos()) return inApp ? 'ios-inapp' : 'ios'
  if (/Android/i.test(ua)) return inApp ? 'android-inapp' : 'android'
  return 'hidden'
}

const noSubscribe = () => () => {}

export function InstallBanner() {
  const device = useSyncExternalStore(noSubscribe, readDevice, (): Device => 'hidden')
  const [closed, setClosed] = useState(false)
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPrompt)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function close() {
    setClosed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // 保存できなくても、この画面では閉じる
    }
  }

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    setPrompt(null)
    if (outcome === 'accepted') close()
  }

  if (device === 'hidden' || closed) return null

  return (
    <aside aria-label="ホーム画面に追加" className="flex flex-col gap-2.5 rounded-lg border border-accent p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm leading-normal font-bold">ホーム画面に追加すると、アプリとして使えます</div>
        <button type="button" onClick={close} className="-mt-1 -mr-1 min-h-9 min-w-9 flex-none text-lg leading-none text-muted" aria-label="閉じる">
          ×
        </button>
      </div>
      {prompt ? (
        <button type="button" onClick={install} className="min-h-11 rounded-lg bg-accent text-sm font-bold text-ground">
          ホーム画面に追加
        </button>
      ) : (
        <p className="text-[13px] leading-relaxed text-muted">
          {device === 'ios' && '画面の共有ボタンを押して、「ホーム画面に追加」を選んでください。'}
          {device === 'ios-inapp' && 'LINE などの中では追加できません。Safari で開き直してから、共有ボタンの「ホーム画面に追加」を選んでください。'}
          {device === 'android' && 'ブラウザのメニュー（︙）から「ホーム画面に追加」を選んでください。'}
          {device === 'android-inapp' && 'LINE などの中では追加できません。Chrome で開き直してから、メニュー（︙）の「ホーム画面に追加」を選んでください。'}
        </p>
      )}
    </aside>
  )
}
