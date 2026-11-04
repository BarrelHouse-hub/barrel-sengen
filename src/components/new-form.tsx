'use client'

import { useState } from 'react'
import { createDecl } from '@/app/actions'

const CATS = [
  { id: 'work', label: '仕事' },
  { id: 'love', label: '恋愛' },
  { id: 'hobby', label: '趣味' },
  { id: 'trip', label: '旅' },
  { id: 'life', label: 'くらし' },
]

const field = 'rounded-lg border border-line2 bg-surface px-3 text-base text-ink focus:border-accent focus:outline-none'
const label = 'text-xs font-bold text-muted'
const chip =
  'flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line2 px-3.5 text-sm font-bold text-ink has-checked:border-accent has-checked:bg-accent has-checked:text-ground has-focus-visible:outline-2 has-focus-visible:outline-accent'

export function NewForm({ initialWhat, error }: { initialWhat: string; error: boolean }) {
  const [what, setWhat] = useState(initialWhat)
  const [due, setDue] = useState('')
  const [mode, setMode] = useState('gachi')
  const [cat, setCat] = useState('work')
  const ready = what.trim().length > 0
  const dueLabel = due ? due.replaceAll('-', '/') : '期限なし'

  return (
    <form action={createDecl} className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-muted">仕事でも、恋愛でも、趣味でも。やりたいことを一つ書いて、みんなの前で宣言する。</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="what" className={label}>やること</label>
        <textarea
          id="what"
          name="what"
          rows={3}
          maxLength={140}
          required
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="例：自分のバンドを組む"
          className={`${field} resize-none py-3 leading-relaxed`}
        />
        {error ? <p className="text-xs text-accent" role="alert">やることを書いてください。</p> : null}
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="due" className={label}>いつまでに</label>
          <input id="due" name="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} min-h-11`} />
        </div>
        <fieldset className="flex flex-1 flex-col gap-1.5">
          <legend className={`${label} mb-1.5`}>本気度</legend>
          <div className="flex gap-1.5">
            {[
              { id: 'gachi', label: 'ガチ' },
              { id: 'yuru', label: 'ゆるく' },
            ].map((m) => (
              <label key={m.id} className={`${chip} flex-1`}>
                <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="sr-only" />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={`${label} mb-1.5`}>ジャンル</legend>
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <label key={c.id} className={`${chip} min-h-10 rounded-full font-medium`}>
              <input type="radio" name="cat" value={c.id} checked={cat === c.id} onChange={() => setCat(c.id)} className="sr-only" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="need" className={label}>貸してほしい力（任意）</label>
        <input id="need" name="need" type="text" maxLength={60} placeholder="例：ドラムを叩ける人" className={`${field} min-h-11`} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={label}>宣言カード（手書きの字でボードに貼られます）</span>
        <div className="flex min-h-24 flex-col gap-2 rounded-md bg-paper px-4 py-4 text-paper-ink">
          <p className={`font-hand text-[22px] leading-relaxed ${ready ? 'text-paper-ink' : 'text-paper-muted'}`}>
            {ready ? what : 'ここに宣言が入ります'}
          </p>
          <div className="text-xs text-paper-muted">
            {CATS.find((c) => c.id === cat)?.label} ・ {mode === 'gachi' ? 'ガチ' : 'ゆるく'} ・ 期限 {dueLabel}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!ready}
        className="min-h-13 rounded-xl bg-accent text-base font-bold text-ground disabled:bg-line disabled:text-muted"
      >
        宣言する
      </button>
    </form>
  )
}
