import { JoinForm } from '@/components/join-form'

export default function JoinPage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-3">
        <div className="text-[11px] font-medium tracking-[0.24em] text-muted">BARREL HOUSE</div>
        <h1 className="text-3xl font-bold">宣言ボード</h1>
        <p className="font-hand text-xl leading-relaxed text-ink">やりたいことを宣言して、飲みながら報告する。</p>
      </div>
      <JoinForm />
    </main>
  )
}
