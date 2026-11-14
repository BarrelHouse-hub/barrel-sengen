'use client'

import { useActionState } from 'react'
import { addComment, deleteComment, type CommentState } from '@/app/actions'

/** コメントを書く。送信中はボタンを押せなくして、二重に送らないようにする。 */
export function CommentForm({ declId, placeholder }: { declId: string; placeholder: string }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(addComment, {})
  return (
    <form action={action} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input type="hidden" name="id" value={declId} />
        <label htmlFor="body" className="sr-only">コメント</label>
        <input
          id="body"
          name="body"
          required
          maxLength={200}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-lg border border-line2 bg-surface px-3 text-base focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-bold text-ground disabled:opacity-50"
        >
          {pending ? '送信中…' : '送る'}
        </button>
      </div>
      {state.error ? <p aria-live="polite" className="text-xs text-accent">{state.error}</p> : null}
    </form>
  )
}

/** 自分のコメントを消す。押し間違いを防ぐため、1回確かめる。 */
export function DeleteCommentButton({ id }: { id: string }) {
  const [, action, pending] = useActionState(async (_: null, form: FormData) => {
    await deleteComment(form)
    return null
  }, null)
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm('このコメントを消しますか？')) e.preventDefault()
      }}
      className="shrink-0"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="-my-2 min-h-11 px-2 text-xs text-faint underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? '消しています…' : '消す'}
      </button>
    </form>
  )
}
