/* eslint-disable @next/next/no-img-element -- 自前の認証つきルートから配信する非公開の写真なので next/image を通さない */
import type { Submission } from '@/lib/submissions'

/** 宣言カードの中に並べる成果（写真・ひとこと・PDF） */
export function SubmissionView({ sub }: { sub: Submission }) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-paper2 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-paper-muted">
        <span>成果</span>
        {sub.late ? <span className="rounded border border-stamp px-1.5 py-px text-stamp">遅れて提出</span> : null}
      </div>
      {sub.photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5">
          {sub.photos.map((p) => (
            <a key={p.id} href={`/api/files/${p.id}`} target="_blank" rel="noopener" className="block aspect-square overflow-hidden rounded bg-paper">
              <img src={`/api/files/${p.id}`} alt="成果の写真" loading="lazy" className="size-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}
      {sub.body ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{sub.body}</p> : null}
      {sub.pdf ? (
        <a href={`/api/files/${sub.pdf.id}`} target="_blank" rel="noopener" className="flex min-h-10 items-center gap-1.5 self-start text-[13px] font-bold underline underline-offset-2">
          PDF を開く（{Math.max(1, Math.round(sub.pdf.size / 1024))} KB）
        </a>
      ) : null}
    </div>
  )
}
