import { Suspense } from 'react'
import { Header } from '@/components/header'
import { NewForm } from '@/components/new-form'
import { openRounds } from '@/lib/rounds'
import { requireMe } from '@/lib/session'

export default function NewPage(props: PageProps<'/new'>) {
  return (
    <>
      <Header title="宣言する" sub="何でもいい" />
      <main className="flex flex-1 flex-col px-4 pt-4 pb-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
          <Loader searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  )
}

async function Loader({ searchParams }: { searchParams: PageProps<'/new'>['searchParams'] }) {
  await requireMe()
  const sp = await searchParams
  const what = typeof sp.what === 'string' ? sp.what.slice(0, 140) : ''
  const rounds = (await openRounds()).map((r) => ({ id: r.id, name: r.name, deadline: r.deadline }))
  return <NewForm initialWhat={what} error={sp.e === 'empty'} rounds={rounds} />
}
