export function Header({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ground/95 px-5 pt-[max(env(safe-area-inset-top),20px)] pb-3.5 backdrop-blur">
      <div className="text-[11px] font-medium tracking-[0.24em] text-muted">BARREL HOUSE</div>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-wide">{title}</h1>
        {sub ? <div className="text-xs text-muted">{sub}</div> : null}
      </div>
    </header>
  )
}
