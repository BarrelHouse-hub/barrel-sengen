import Link from 'next/link'
import { currentRound, daysLeft, formatDate, formatMeetup, isAdmin, roundStatus } from '@/lib/rounds'

/** ボードのいちばん上。今のラウンドの締め切り・報告会・自分の提出状況。 */
export async function RoundCard({ memberId }: { memberId: string }) {
  const [round, admin] = await Promise.all([currentRound(), isAdmin(memberId)])
  if (!round) {
    return admin ? (
      <Link href="/rounds/new" className="flex min-h-11 items-center justify-center rounded-xl border border-dashed border-accent text-sm font-bold text-accent">
        ラウンドを作る（運営）
      </Link>
    ) : null
  }
  const st = await roundStatus(round.id, memberId)
  const left = daysLeft(round.deadline)
  const leftLabel = left > 0 ? `あと ${left} 日` : left === 0 ? '今日まで' : '締め切りました'
  const mine =
    st.mine.total === 0
      ? null
      : st.mine.reported === st.mine.total
        ? '提出済み'
        : st.mine.reported > 0
          ? `未提出あり（${st.mine.reported}/${st.mine.total} 件）`
          : '未提出'

  return (
    <section aria-label="今のラウンド" className="flex flex-col gap-3 rounded-xl border border-accent p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold tracking-[0.12em] text-accent">今のラウンド</span>
          <h2 className="text-lg font-bold">{round.name}</h2>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${left >= 0 && left <= 3 ? 'text-accent' : ''}`}>{leftLabel}</div>
          <div className="text-xs text-muted">締め切り {formatDate(round.deadline)}</div>
        </div>
      </div>

      {round.meetup_at || round.meetup_place ? (
        <div className="flex flex-col gap-0.5 rounded-lg bg-surface px-3 py-2.5 text-sm">
          <span className="text-[11px] font-bold text-muted">報告会</span>
          <span>
            {round.meetup_at ? formatMeetup(round.meetup_at) : '日時未定'}
            {round.meetup_place ? ` ・ ${round.meetup_place}` : ''}
          </span>
          {round.meetup_map_url ? (
            <a href={round.meetup_map_url} target="_blank" rel="noopener noreferrer" className="flex min-h-9 items-center self-start text-xs font-bold text-accent underline underline-offset-2">
              地図を開く
            </a>
          ) : null}
        </div>
      ) : null}

      {round.note ? <p className="text-[13px] leading-relaxed text-muted">{round.note}</p> : null}

      <div className="flex items-center justify-between gap-3 text-sm">
        {mine ? (
          <span className={`font-bold ${mine === '提出済み' ? 'text-ink' : 'text-accent'}`}>あなた：{mine}</span>
        ) : left >= 0 ? (
          <Link href="/new" className="flex min-h-10 items-center rounded-lg bg-accent px-3.5 text-sm font-bold text-ground">
            このラウンドで宣言する
          </Link>
        ) : (
          <span className="text-muted">あなた：宣言なし</span>
        )}
        <span className="text-xs text-muted">
          提出済み {st.submitted} / {st.members} 人
        </span>
      </div>

      {admin ? (
        <Link href="/rounds/new" className="flex min-h-9 items-center self-end text-xs text-muted underline underline-offset-2">
          次のラウンドを作る（運営）
        </Link>
      ) : null}
    </section>
  )
}
