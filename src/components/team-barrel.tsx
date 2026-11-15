import { MASCOT_NAME } from '@/lib/mascot-name'
import { currentRound, teamBarrel, teamBarrelEnabled } from '@/lib/rounds'

/** たまり具合に応じたたるまるのひとこと（テンプレート） */
function sayBarrel(done: number, total: number) {
  if (done === 0) return 'まだ空っぽやねん。だれかの「達成した」で、ひと口目を注いでな。'
  if (done >= total) return '満タンや！みんなでいっぱいにした樽、報告会でこれで乾杯しよな！'
  const rest = total - done
  if (done * 2 >= total) return `もう少しで満タンや！あと ${rest} 件の「達成」で樽がいっぱいになるで。`
  return 'ちょっとずつたまってきたで。ええ香りしてきた。この調子でいこな。'
}

/**
 * みんなの樽（お試し）。今のラウンドの宣言のうち「達成した」の割合だけ中身がたまる。
 * ラウンドが無い・宣言が0件・BARREL_TEAM_BARREL=off のときは出さない。
 */
export async function TeamBarrel() {
  if (!teamBarrelEnabled()) return null
  const round = await currentRound()
  if (!round) return null
  const { total, done } = await teamBarrel(round.id)
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  const full = done >= total

  return (
    <section
      aria-label="みんなの樽"
      className={`flex items-center gap-3 rounded-xl border p-3 ${full ? 'border-accent bg-accent/15' : 'border-line bg-surface/60'}`}
    >
      <BarrelGauge pct={pct} full={full} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-[11px] font-bold tracking-[0.12em] ${full ? 'text-accent' : 'text-muted'}`}>
            みんなの樽{full ? ' ・ 満タン' : ''}
          </span>
          <span className="text-xs text-muted">
            達成 {done} / {total} 件
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="樽のたまり具合"
          className="h-2 overflow-hidden rounded-full bg-line"
        >
          <div className={`h-full rounded-full ${full ? 'bg-paper' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[13px] leading-relaxed">
          <span className="font-bold text-accent">{MASCOT_NAME}</span>
          <span className="text-muted">「</span>
          {sayBarrel(done, total)}
          <span className="text-muted">」</span>
        </p>
      </div>
    </section>
  )
}

/** たるまる（仮）の樽の形で、中身が下からたまる。満タンは金色に光る。 */
function BarrelGauge({ pct, full }: { pct: number; full: boolean }) {
  // 胴の内側は y=14〜55。下から pct の高さまで中身を描く
  const top = 55 - (41 * pct) / 100
  const liquid = full ? '#f2c46b' : '#e0a34e'
  return (
    <svg width={64} height={64} viewBox="0 0 64 64" role="img" aria-label={`${MASCOT_NAME}の樽 ${pct}%`} className="shrink-0">
      <defs>
        <clipPath id="team-barrel-body">
          <path d="M14 14 Q9 33 14 52 Q32 58 50 52 Q55 33 50 14 Z" />
        </clipPath>
      </defs>
      {full ? <circle cx="32" cy="34" r="30" fill="#f2c46b" opacity="0.18" /> : null}
      <ellipse cx="32" cy="60" rx="16" ry="2.5" fill="#000" opacity="0.3" />
      <path d="M14 14 Q9 33 14 52 Q32 58 50 52 Q55 33 50 14 Z" fill="#3a2e25" />
      <g clipPath="url(#team-barrel-body)">
        {pct > 0 ? <rect x="0" y={top} width="64" height={64 - top} fill={liquid} opacity="0.9" /> : null}
        {pct > 0 && !full ? <path d={`M8 ${top} Q20 ${top - 2} 32 ${top} T56 ${top}`} fill="none" stroke="#f4ecdf" strokeWidth="1" opacity="0.6" /> : null}
      </g>
      <path d="M14 14 Q9 33 14 52 Q32 58 50 52 Q55 33 50 14 Z" fill="none" stroke="#2b211a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M23 12 Q20 33 23 55 M41 12 Q44 33 41 55" fill="none" stroke="#2b211a" strokeWidth="1" opacity="0.5" />
      <path d="M12 23 Q32 29 52 23" fill="none" stroke="#2b211a" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 44 Q32 50 52 44" fill="none" stroke="#2b211a" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="32" cy="14" rx="18" ry="5" fill={full ? '#f2c46b' : '#c98a55'} stroke="#2b211a" strokeWidth="2" />
      <circle cx="25" cy="33" r="2.4" fill="#2b211a" />
      <circle cx="39" cy="33" r="2.4" fill="#2b211a" />
      <circle cx="25.8" cy="32.2" r="0.8" fill="#f4ecdf" />
      <circle cx="39.8" cy="32.2" r="0.8" fill="#f4ecdf" />
      {full ? (
        <path d="M27.5 37 Q32 42.5 36.5 37 Z" fill="#2b211a" />
      ) : pct === 0 ? (
        <path d="M29 39 L35 39" fill="none" stroke="#2b211a" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M28.5 37.5 Q32 41 35.5 37.5" fill="none" stroke="#2b211a" strokeWidth="1.8" strokeLinecap="round" />
      )}
      {full ? (
        <>
          <path d="M8 8 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5 Z" fill="#f2c46b" />
          <path d="M55 5 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1 Z" fill="#f2c46b" />
        </>
      ) : null}
    </svg>
  )
}
