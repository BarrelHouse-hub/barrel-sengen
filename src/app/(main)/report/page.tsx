import Link from 'next/link'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { CardsSkeleton, CheerButton } from '@/components/decl-card'
import { LogoutForm } from '@/components/logout-form'
import { NotifyToggle } from '@/components/notify-toggle'
import { CAT_LABEL, formatDue, listDecls } from '@/lib/data'
import { requireMe } from '@/lib/session'

export default function ReportPage() {
  return (
    <>
      <Header title="報告" />
      <main className="flex flex-1 flex-col gap-3.5 px-4 pt-4 pb-6">
        <Suspense fallback={<CardsSkeleton />}>
          <Report />
        </Suspense>
      </main>
    </>
  )
}

async function Report() {
  const me = await requireMe()
  const all = await listDecls(me.id)
  const done = all.filter((d) => d.status === 'done')
  const miss = all.filter((d) => d.status === 'miss')
  const achievers = [...new Set(done.map((d) => d.name))]
  const myDoing = all.filter((d) => d.member_id === me.id && d.status === 'doing')

  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-xl border border-accent p-4">
        <div className="flex items-center gap-2 text-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 16l20-6-3-3-6 2-6-4-2 1 4 5-5 2-2-1-1 1 3 3z" />
            <path d="M3 21h18" />
          </svg>
          <span className="text-xs font-bold tracking-[0.12em]">達成旅行</span>
        </div>
        <div className="text-lg leading-normal font-bold">宣言を達成した人だけで行く旅。行き先はみんなで決める（候補：グアム）</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {achievers.map((n) => (
            <div key={n} title={n} className="flex size-8 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-ground">
              {Array.from(n)[0]}
            </div>
          ))}
          <span className="ml-1 text-[13px] text-muted">達成者 {achievers.length} 人</span>
        </div>
      </section>

      {myDoing.length > 0 ? (
        <section className="flex flex-col gap-2 rounded-xl bg-surface p-4">
          <h2 className="text-sm font-bold text-muted">あなたの挑戦中</h2>
          {myDoing.map((d) => (
            <Link key={d.id} href={`/d/${d.id}`} className="flex min-h-11 items-center justify-between gap-3 border-t border-line pt-2 first-of-type:border-0 first-of-type:pt-0">
              <span className="font-hand text-lg">{d.what}</span>
              <span className="shrink-0 text-xs font-bold text-accent">報告する</span>
            </Link>
          ))}
        </section>
      ) : null}

      <h2 className="mt-1.5 text-sm font-bold text-muted">達成しました</h2>
      {done.length === 0 ? <p className="text-sm text-faint">まだありません。</p> : null}
      {done.map((d) => (
        <article key={d.id} className="flex items-center gap-3 rounded-md bg-paper px-4 py-3.5 text-paper-ink">
          <Link href={`/d/${d.id}`} className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-paper-muted">
              {d.name} ・ {CAT_LABEL[d.cat]}
            </span>
            <span className="font-hand text-[19px] leading-normal">{d.what}</span>
          </Link>
          <CheerButton d={d} size="lg" />
        </article>
      ))}

      <h2 className="mt-1.5 text-sm font-bold text-muted">なんでできなかったんだろうね会</h2>
      {miss.length === 0 ? <p className="text-sm text-faint">まだありません。</p> : null}
      {miss.map((d) => (
        <article key={d.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">
              {d.name} ・ 期限 {formatDue(d.due)} ・ コメント {d.comment_count}
            </span>
            <span className="font-hand text-[19px] leading-normal">{d.what}</span>
          </div>
          <div className="flex gap-2">
            <Link href={`/d/${d.id}#comments`} className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-paper-muted text-sm font-bold">
              ツッコむ
            </Link>
            {d.member_id === me.id ? (
              <Link href={`/new?what=${encodeURIComponent(d.what)}`} className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-accent text-sm font-bold text-ground">
                再宣言する
              </Link>
            ) : null}
          </div>
        </article>
      ))}

      <NotifyToggle />
      <LogoutForm name={me.name} />
    </>
  )
}
