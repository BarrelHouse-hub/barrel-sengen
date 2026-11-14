import Link from 'next/link'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { Bubble, Mascot } from '@/components/mascot'
import { MarkRead, PushToggle } from '@/components/mascot-client'
import { answerCheckin, setCheckinFreq } from '@/app/actions'
import { generateFor, getCheckinFreq, listMessages, MASCOT_NAME, type CheckinFreq } from '@/lib/mascot'
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
  checkin: '調子どう？',
  checkin_reply: 'お返事',
  due_soon: '期限まぢか',
  overdue: '期限きたで',
  done: 'おめでとう',
  recommend: 'おすすめ',
  nudge: 'ひと声',
  intro: '紹介できるで',
  help: '手伝えるで',
  comment: 'コメント',
  cheer: '乾杯',
  push_reset: '通知のこと',
  round_start: 'ラウンド開始',
  round_due3: '締め切りまぢか',
  round_due1: '締め切りまぢか',
  round_due0: '締め切り当日',
  round_meetup: '報告会',
}

const FREQS: { id: CheckinFreq; label: string; note: string }[] = [
  { id: 'more', label: '多め', note: '3日おきくらいに様子を聞きにいくで。' },
  { id: 'normal', label: 'ふつう', note: '週1くらいに様子を聞きにいくで。' },
  { id: 'less', label: '少なめ', note: '期限の知らせだけにするで。' },
]

const FEELINGS = [
  { id: 'good', label: '順調' },
  { id: 'stuck', label: 'ちょっと止まってる' },
  { id: 'tired', label: 'しんどい' },
] as const

function FreqSetting({ freq }: { freq: CheckinFreq }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line p-4">
      <h2 className="text-sm font-bold">声かけの頻度</h2>
      <div className="flex gap-2">
        {FREQS.map((f) => (
          <form key={f.id} action={setCheckinFreq} className="flex-1">
            <input type="hidden" name="freq" value={f.id} />
            <button
              type="submit"
              aria-pressed={freq === f.id}
              className={`min-h-11 w-full rounded-lg text-sm font-bold ${freq === f.id ? 'bg-accent text-ground' : 'border border-line2 text-ink'}`}
            >
              {f.label}
            </button>
          </form>
        ))}
      </div>
      <p className="text-xs text-muted">
        {FREQS.find((f) => f.id === freq)?.note} お便りは1日1回、夜7時ごろにまとめて届くで。
      </p>
    </section>
  )
}

function when(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function Letters() {
  const me = await requireMe()
  await generateFor(me.id)
  const [msgs, freq] = await Promise.all([listMessages(me.id), getCheckinFreq(me.id)])
  const hasUnread = msgs.some((m) => !m.read_at)

  return (
    <>
      <MarkRead hasUnread={hasUnread} />
      <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
      <FreqSetting freq={freq} />
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
              {m.kind === 'checkin' ? (
                m.reply ? (
                  <p className={`mt-1.5 text-xs font-bold ${m.read_at ? 'text-muted' : 'text-paper-muted'}`}>
                    返事：{FEELINGS.find((f) => f.id === m.reply)?.label}
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {FEELINGS.map((f) => (
                      <form key={f.id} action={answerCheckin}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="feeling" value={f.id} />
                        <button
                          type="submit"
                          className={`min-h-10 rounded-full border px-3 text-xs font-bold ${m.read_at ? 'border-line2 text-ink' : 'border-paper-muted text-paper-ink'}`}
                        >
                          {f.label}
                        </button>
                      </form>
                    ))}
                  </div>
                )
              ) : null}
              {m.decl_id ? (
                <Link href={`/d/${m.decl_id}`} className={`mt-1.5 inline-flex min-h-9 items-center text-xs font-bold underline underline-offset-2 ${m.read_at ? 'text-accent' : 'text-paper-ink'}`}>
                  {m.kind === 'recommend' ? 'その宣言を見る' : '自分の宣言を見る'}
                </Link>
              ) : m.kind === 'round_start' || m.kind === 'round_meetup' ? (
                <Link href="/" className={`mt-1.5 inline-flex min-h-9 items-center text-xs font-bold underline underline-offset-2 ${m.read_at ? 'text-accent' : 'text-paper-ink'}`}>
                  ボードで見る
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
