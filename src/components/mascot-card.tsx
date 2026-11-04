import Link from 'next/link'
import { Bubble, Mascot } from '@/components/mascot'
import { MASCOT_NAME } from '@/lib/mascot-name'
import { generateFor, unreadSummary } from '@/lib/mascot'

/** ボードの一番上。未読のお便りがあれば最新の1通を見せる。 */
export async function MascotCard({ memberId }: { memberId: string }) {
  await generateFor(memberId)
  const { latest, count } = await unreadSummary(memberId)
  return (
    <Link href="/mascot" className="flex items-start gap-3 rounded-xl border border-line bg-surface/60 p-3">
      <div className="relative shrink-0">
        <Mascot size={52} />
        {count > 0 ? (
          <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-ground">
            {count}
          </span>
        ) : null}
      </div>
      <Bubble>
        <div className="mb-0.5 text-[11px] font-bold text-paper-muted">
          {MASCOT_NAME}
          {count > 0 ? ` ・ お便り ${count} 通` : ''}
        </div>
        {latest ? latest.body : '今日もええ夜にしよな。お便りはここに届くで。'}
      </Bubble>
    </Link>
  )
}
