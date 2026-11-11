import Link from 'next/link'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { CardsSkeleton, DeclCard } from '@/components/decl-card'
import { InstallBanner } from '@/components/install-banner'
import { MascotCard } from '@/components/mascot-card'
import { RoundCard } from '@/components/round-card'
import { CATS, listDecls } from '@/lib/data'
import { requireMe } from '@/lib/session'
import { submissionsFor } from '@/lib/submissions'

export default function BoardPage(props: PageProps<'/'>) {
  return (
    <>
      <Header title="宣言ボード" />
      <main className="flex flex-1 flex-col gap-3.5 px-4 pt-4 pb-6">
        <InstallBanner />
        <Suspense fallback={<CardsSkeleton />}>
          <Board searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  )
}

async function Board({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  const me = await requireMe()
  const sp = await searchParams
  const cat = typeof sp.cat === 'string' ? sp.cat : 'all'
  const all = await listDecls(me.id)
  const list = all.filter((d) => cat === 'all' || d.cat === cat)
  const subs = await submissionsFor(list.map((d) => d.id))
  const doing = all.filter((d) => d.status === 'doing').length
  const chips = [{ id: 'all', label: 'すべて' }, ...CATS]

  return (
    <>
      <RoundCard memberId={me.id} />
      <MascotCard memberId={me.id} />
      <div className="flex items-center justify-between text-xs text-muted">
        <span>挑戦中 {doing} 件</span>
        <span>{me.name} さん</span>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
        {chips.map((c) => {
          const active = c.id === cat
          return (
            <Link
              key={c.id}
              href={c.id === 'all' ? '/' : `/?cat=${c.id}`}
              aria-current={active ? 'true' : undefined}
              className={`flex min-h-9 flex-none items-center rounded-full border px-3.5 text-[13px] font-medium ${active ? 'border-accent bg-accent text-ground' : 'border-line2 text-ink'}`}
            >
              {c.label}
            </Link>
          )
        })}
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line2 px-6 py-10 text-center">
          <p className="text-sm leading-relaxed text-muted">まだ宣言がありません。最初の一枚を貼ってみよう。</p>
          <Link href="/new" className="flex min-h-11 items-center rounded-lg bg-accent px-5 text-sm font-bold text-ground">
            宣言する
          </Link>
        </div>
      ) : (
        list.map((d) => <DeclCard key={d.id} d={d} meId={me.id} sub={subs.get(d.id)} />)
      )}
    </>
  )
}
