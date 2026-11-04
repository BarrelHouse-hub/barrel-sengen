import Link from 'next/link'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { CardsSkeleton } from '@/components/decl-card'
import { toggleOffer } from '@/app/actions'
import { listDecls } from '@/lib/data'
import { requireMe } from '@/lib/session'

export default function HelpPage() {
  return (
    <>
      <Header title="力を貸して" />
      <main className="flex flex-1 flex-col gap-3.5 px-4 pt-4 pb-6">
        <p className="text-[13px] leading-relaxed text-muted">仕事じゃなくていい。できることで手を挙げる、知り合いをつなぐ。</p>
        <Suspense fallback={<CardsSkeleton />}>
          <Asks />
        </Suspense>
      </main>
    </>
  )
}

function OfferButton({ id, kind, on, children }: { id: string; kind: 'help' | 'intro'; on: boolean; children: React.ReactNode }) {
  const tone =
    kind === 'help'
      ? on
        ? 'border-accent bg-accent text-ground'
        : 'border-accent text-accent'
      : on
        ? 'border-ink bg-ink text-ground'
        : 'border-paper-muted text-ink'
  return (
    <form action={toggleOffer} className="flex-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <button type="submit" aria-pressed={on} className={`min-h-11 w-full rounded-lg border text-sm font-bold ${tone}`}>
        {children}
      </button>
    </form>
  )
}

async function Asks() {
  const me = await requireMe()
  const asks = (await listDecls(me.id)).filter((d) => d.need && d.status === 'doing')
  if (asks.length === 0)
    return <p className="rounded-lg border border-dashed border-line2 px-6 py-10 text-center text-sm text-muted">いまは募集がありません。宣言するときに「貸してほしい力」を書くとここに出ます。</p>

  return asks.map((a) => {
    const mine = a.member_id === me.id
    return (
      <article key={a.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-1">
          <Link href={`/d/${a.id}`} className="text-xs text-muted underline-offset-2 hover:underline">
            {a.name} の宣言「{a.what}」
          </Link>
          <div className="text-lg leading-normal font-bold">{a.need} を探しています</div>
        </div>
        {mine ? (
          <p className="text-xs text-muted">あなたの募集です。</p>
        ) : (
          <div className="flex gap-2">
            <OfferButton id={a.id} kind="help" on={a.helped}>
              {a.helped ? '手を挙げました' : '手伝える'}
            </OfferButton>
            <OfferButton id={a.id} kind="intro" on={a.introed}>
              {a.introed ? '紹介を申し出ました' : '知り合いを紹介'}
            </OfferButton>
          </div>
        )}
        <div className="text-xs text-muted">
          手を挙げた人 {a.help_count} ・ 紹介 {a.intro_count}
        </div>
      </article>
    )
  })
}
