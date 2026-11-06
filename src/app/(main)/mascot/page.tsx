import Link from 'next/link'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { Bubble, Mascot } from '@/components/mascot'
import { MarkRead, PushToggle } from '@/components/mascot-client'
import { generateFor, listMessages, MASCOT_NAME } from '@/lib/mascot'
import { requireMe } from '@/lib/session'

export default function MascotPage() {
  return (
    <>
      <Header title={`${MASCOT_NAME}のお便り`} sub={<Link href="/" className="flex min-h-11 items-center text-muted">ボードへ戻る</Link>} />
      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-6">
        <div className="flex items-center gap-4 rounded-xl bg-surface p-4">
          <Mascot size={72} />
          <p className="text-sm leading-relaxed text-muted">
            バレルハウスの樽の子、{MASCOT_NAME}（仮）やで。宣言の様子を聞きにきたり、あなたの好きそうな宣言を紹介したりするで。
          </p>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface" />}>
          <Letters />
        </Suspense>
      </main>
    </>
  )
}

const LABEL: Record<string, string> = {
  welcome: 'ようこそ',
  progress: '進捗どう？',
  due_soon: '期限まぢか',
  overdue: '期限きたで',
  done: 'おめでとう',
  recommend: 'おすすめ',
  nudge: 'ひと声',
  intro: '紹介できるで',
  help: '手伝えるで',
  comment: 'コメント',
  cheer: '乾杯',
}

function when(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function Letters() {
  const me = await requireMe()
  await generateFor(me.id)
  const msgs = await listMessages(me.id)
  const hasUnread = msgs.some((m) => !m.read_at)

  return (
    <>
      <MarkRead hasUnread={hasUnread} />
      <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
      <h2 className="mt-1 text-sm font-bold text-muted">お便り</h2>
      {msgs.length === 0 ? <p className="text-sm text-faint">まだありません。宣言すると、ときどき届きます。</p> : null}
      <ol className="flex flex-col gap-3">
        {msgs.map((m) => (
          <li key={m.id} className="flex items-start gap-2.5">
            <Mascot size={36} className="mt-1 shrink-0" />
            <Bubble tone={m.read_at ? 'dark' : 'paper'}>
              <div className={`mb-0.5 flex items-center gap-2 text-[11px] font-bold ${m.read_at ? 'text-muted' : 'text-paper-muted'}`}>
                <span>{LABEL[m.kind] ?? ''}</span>
                <span className="font-normal">{when(m.created_at)}</span>
                {!m.read_at ? <span className="rounded bg-accent px-1.5 text-ground">新着</span> : null}
              </div>
              <p>{m.body}</p>
              {m.decl_id ? (
                <Link href={`/d/${m.decl_id}`} className={`mt-1.5 inline-flex min-h-9 items-center text-xs font-bold underline underline-offset-2 ${m.read_at ? 'text-accent' : 'text-paper-ink'}`}>
                  {m.kind === 'recommend' ? 'その宣言を見る' : '自分の宣言を見る'}
                </Link>
              ) : m.kind === 'nudge' || m.kind === 'welcome' ? (
                <Link href="/new" className={`mt-1.5 inline-flex min-h-9 items-center text-xs font-bold underline underline-offset-2 ${m.read_at ? 'text-accent' : 'text-paper-ink'}`}>
                  宣言する
                </Link>
              ) : null}
            </Bubble>
          </li>
        ))}
      </ol>
    </>
  )
}
