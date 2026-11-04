'use client'

import { useActionState } from 'react'
import { join, type JoinState } from '@/app/actions'

export function JoinForm() {
  const [state, action, pending] = useActionState<JoinState, FormData>(join, {})
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-bold text-muted">ニックネーム</label>
        <input id="name" name="name" required maxLength={20} autoComplete="nickname" placeholder="みんなに呼ばれている名前" className="min-h-12 rounded-lg border border-line2 bg-surface px-3 text-base focus:border-accent focus:outline-none" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pass" className="text-xs font-bold text-muted">合言葉</label>
        <input id="pass" name="pass" type="password" required autoComplete="off" placeholder="お店で聞いた合言葉" className="min-h-12 rounded-lg border border-line2 bg-surface px-3 text-base focus:border-accent focus:outline-none" />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="min-h-13 rounded-xl bg-accent text-base font-bold text-ground disabled:opacity-60">
        {pending ? '入っています…' : 'はじめる'}
      </button>
      <p className="text-xs leading-relaxed text-faint">前に使ったニックネームを入れると、その名前で続きから使えます。</p>
    </form>
  )
}
