'use client'

import { useActionState, useState } from 'react'
import { createRound, type RoundFormState } from '@/app/actions'

const field = 'rounded-lg border border-line2 bg-surface px-3 text-base text-ink focus:border-accent focus:outline-none'
const label = 'text-xs font-bold text-muted'
const chip =
  'flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-line2 px-3.5 text-sm font-bold text-ink has-checked:border-accent has-checked:bg-accent has-checked:text-ground has-focus-visible:outline-2 has-focus-visible:outline-accent'

export function RoundForm({ twoWeeks, oneMonth }: { twoWeeks: string; oneMonth: string }) {
  const [state, action, pending] = useActionState<RoundFormState, FormData>(createRound, {})
  const [span, setSpan] = useState<'2w' | 'month'>('2w')
  const [deadline, setDeadline] = useState(twoWeeks)

  function pick(s: '2w' | 'month') {
    setSpan(s)
    setDeadline(s === 'month' ? oneMonth : twoWeeks)
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted">作ると、メンバー全員にお便りとスマホ通知で知らせます。</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={label}>名前</label>
        <input id="name" name="name" required maxLength={30} placeholder="例：第1回" className={`${field} min-h-11`} />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={`${label} mb-1.5`}>期間</legend>
        <div className="flex gap-2">
          <label className={chip}>
            <input type="radio" name="span" value="2w" checked={span === '2w'} onChange={() => pick('2w')} className="sr-only" />
            2週間
          </label>
          <label className={chip}>
            <input type="radio" name="span" value="month" checked={span === 'month'} onChange={() => pick('month')} className="sr-only" />
            1ヶ月
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="deadline" className={label}>締め切り日（この日まで提出できる）</label>
        <input id="deadline" name="deadline" type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${field} min-h-11`} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="meetup_at" className={label}>報告会の日時（任意）</label>
        <input id="meetup_at" name="meetup_at" type="datetime-local" className={`${field} min-h-11`} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="meetup_place" className={label}>報告会の場所・店名（任意）</label>
        <input id="meetup_place" name="meetup_place" maxLength={60} placeholder="例：バレルハウス" className={`${field} min-h-11`} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="meetup_map_url" className={label}>地図の URL（任意）</label>
        <input id="meetup_map_url" name="meetup_map_url" type="url" inputMode="url" maxLength={500} placeholder="https://maps.app.goo.gl/…" className={`${field} min-h-11`} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className={label}>ひとこと（任意）</label>
        <textarea id="note" name="note" rows={2} maxLength={200} className={`${field} resize-none py-3 leading-relaxed`} />
      </div>

      {state.error ? <p className="text-sm text-accent" role="alert">{state.error}</p> : null}

      <button type="submit" disabled={pending} className="min-h-13 rounded-xl bg-accent text-base font-bold text-ground disabled:bg-line disabled:text-muted">
        {pending ? '作っています…' : 'ラウンドを作って知らせる'}
      </button>
    </form>
  )
}
