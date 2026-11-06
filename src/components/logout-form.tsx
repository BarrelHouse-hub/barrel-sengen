'use client'

import { deletePushSubscription, logout } from '@/app/actions'

// 同じ端末で別の人がログインしたときに、前の人の通知が届かないよう解除してから出る
export function LogoutForm({ name }: { name: string }) {
  async function action() {
    try {
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await deletePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
    } catch (e) {
      console.error('通知の解除に失敗', e)
    }
    await logout()
  }

  return (
    <form action={action} className="mt-6 flex items-center justify-center gap-2 text-xs text-faint">
      <span>{name} としてログイン中</span>
      <button type="submit" className="min-h-11 px-2 text-muted underline underline-offset-2">
        ログアウト
      </button>
    </form>
  )
}
