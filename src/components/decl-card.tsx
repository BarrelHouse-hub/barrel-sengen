import Link from 'next/link'
import { toggleCheer, toggleOffer } from '@/app/actions'
import { CAT_LABEL, formatDue, type Decl } from '@/lib/data'

export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  return (
    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${className}`} aria-hidden="true">
      {Array.from(name)[0]}
    </div>
  )
}

export function ModeTag({ mode }: { mode: Decl['mode'] }) {
  return mode === 'gachi' ? (
    <span className="rounded bg-paper-ink px-2 py-0.5 text-[11px] font-bold text-paper">ガチ</span>
  ) : (
    <span className="rounded border border-paper-muted px-[7px] py-px text-[11px] font-bold text-paper-muted">ゆるく</span>
  )
}

export function Stamp({ status }: { status: Decl['status'] }) {
  if (status === 'done')
    return (
      <div className="absolute top-[58px] right-3.5 flex size-[54px] -rotate-12 items-center justify-center rounded-full border-2 border-stamp text-[15px] font-bold text-stamp">
        達成
      </div>
    )
  if (status === 'miss')
    return (
      <div className="absolute top-[58px] right-3.5 flex size-[54px] rotate-[8deg] items-center justify-center rounded-full border-2 border-dashed border-paper-muted text-[15px] font-bold text-paper-muted">
        未達
      </div>
    )
  return null
}

export function CheerButton({ d, size = 'sm' }: { d: Decl; size?: 'sm' | 'lg' }) {
  return (
    <form action={toggleCheer}>
      <input type="hidden" name="id" value={d.id} />
      <button
        type="submit"
        aria-pressed={d.cheered}
        className={`flex items-center gap-1.5 rounded-full border border-paper-ink px-3 text-[13px] font-bold ${size === 'lg' ? 'min-h-11' : 'min-h-10'} ${d.cheered ? 'bg-paper-ink text-paper' : 'text-paper-ink'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 3h6l-1 7a2 2 0 0 1-4 0L7 3z" />
          <path d="M10 12v6" />
          <path d="M7.5 21h5" />
          <path d="M14 6h4l-.7 5a1.7 1.7 0 0 1-3.3 0" />
        </svg>
        乾杯 {d.cheer_count}
      </button>
    </form>
  )
}

export function DeclCard({ d, meId }: { d: Decl; meId: string }) {
  const mine = d.member_id === meId
  return (
    <article className="relative flex flex-col gap-3 rounded-md bg-paper px-4 pt-4 pb-3.5 text-paper-ink shadow-[0_1px_0_#00000040]">
      <div className="flex items-center gap-2.5">
        <Avatar name={d.name} className="bg-paper-ink text-paper" />
        <div className="flex flex-1 flex-col">
          <div className="text-sm font-bold">{d.name}</div>
          <div className="text-xs text-paper-muted">
            {CAT_LABEL[d.cat]} ・ 期限 {formatDue(d.due)}
          </div>
        </div>
        <ModeTag mode={d.mode} />
      </div>

      <Link href={`/d/${d.id}`} className="pr-12 font-hand text-[22px] leading-relaxed tracking-wide text-paper-ink">
        {d.what}
      </Link>
      <Stamp status={d.status} />

      {d.need && d.status === 'doing' ? (
        <div className="flex items-center gap-2.5 rounded-md bg-paper2 px-3 py-2.5">
          <div className="flex flex-1 flex-col gap-0.5">
            <div className="text-[11px] font-bold tracking-wider text-paper-muted">力を貸して</div>
            <div className="text-sm font-medium">{d.need}</div>
          </div>
          {mine ? null : (
            <form action={toggleOffer}>
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="kind" value="help" />
              <button
                type="submit"
                aria-pressed={d.helped}
                className={`min-h-11 rounded-md border border-paper-ink px-3 text-[13px] font-bold ${d.helped ? 'bg-paper-ink text-paper' : ''}`}
              >
                {d.helped ? '手を挙げました' : '手伝える'}
              </button>
            </form>
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <CheerButton d={d} />
        <Link href={`/d/${d.id}`} className="flex min-h-10 items-center px-2 text-xs font-medium text-paper-muted underline-offset-2 hover:underline">
          コメント {d.comment_count} ・ 手を挙げた人 {d.help_count + d.intro_count}
        </Link>
      </div>
    </article>
  )
}

export function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-3.5" aria-busy="true" aria-label="読み込み中">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-md bg-surface" />
      ))}
    </div>
  )
}
