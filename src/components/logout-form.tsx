'use client'

import { logout } from '@/app/actions'
import { currentSubscription } from '@/lib/push-client'

// 同じ端末で別の人がログインしたときに、前の人の通知が届かないよう解除してから出る
export function LogoutForm({ name }: { name: string }) {
  async function action(form: FormData) {
    try {
      const sub = await currentSubscription()
      if (sub) {
        form.set('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
    } catch (e) {
      console.error('通知の解除に失敗', e)
    }
    await logout(form)
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
