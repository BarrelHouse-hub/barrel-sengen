import Link from 'next/link'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { RoundForm } from '@/components/round-form'
import { addDays, addMonths, isAdmin, todayJst } from '@/lib/rounds'
import { requireMe } from '@/lib/session'

export default function NewRoundPage() {
  return (
    <>
      <Header title="ラウンドを作る" sub={<Link href="/" className="flex min-h-11 items-center text-muted">ボードへ戻る</Link>} />
      <main className="flex flex-1 flex-col px-4 pt-4 pb-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
          <Loader />
        </Suspense>
      </main>
    </>
  )
}

async function Loader() {
  const me = await requireMe()
  if (!(await isAdmin(me.id))) {
    return <p className="text-sm leading-relaxed text-muted">ラウンドを作れるのは運営だけです。</p>
  }
  const today = todayJst()
  return <RoundForm twoWeeks={addDays(today, 14)} oneMonth={addMonths(today, 1)} />
}
