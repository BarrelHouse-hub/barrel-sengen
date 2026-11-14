import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { CardsSkeleton, DeclCard } from '@/components/decl-card'
import { deleteDecl, setStatus } from '@/app/actions'
import { CommentForm, DeleteCommentButton } from '@/components/comment-form'
import { getDecl, listComments, listOffers } from '@/lib/data'
import { requireMe } from '@/lib/session'
import { SubmitForm } from '@/components/submit-form'
import { todayJst } from '@/lib/rounds'
import { submissionsFor } from '@/lib/submissions'

export default function DeclPage(props: PageProps<'/d/[id]'>) {
  return (
    <>
      <Header title="宣言" sub={<Link href="/" className="flex min-h-11 items-center text-muted">ボードへ戻る</Link>} />
      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-6">
        <Suspense fallback={<CardsSkeleton />}>
          <Detail params={props.params} />
        </Suspense>
      </main>
    </>
  )
}

function StatusButton({ id, status, children, primary }: { id: string; status: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <form action={setStatus} className="flex-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`min-h-11 w-full rounded-lg text-sm font-bold ${primary ? 'bg-accent text-ground' : 'border border-paper-muted text-ink'}`}>
        {children}
      </button>
    </form>
  )
}

async function Detail({ params }: { params: PageProps<'/d/[id]'>['params'] }) {
  const me = await requireMe()
  const { id } = await params
  const d = await getDecl(me.id, id)
  if (!d) notFound()
  const [offers, comments, subs] = await Promise.all([listOffers(d.id), listComments(d.id), submissionsFor([d.id])])
  const sub = subs.get(d.id)
  const mine = d.member_id === me.id
  const helpers = offers.filter((o) => o.kind === 'help').map((o) => o.name)
  const introducers = offers.filter((o) => o.kind === 'intro').map((o) => o.name)

  return (
    <>
      <DeclCard d={d} meId={me.id} sub={sub} />

      {mine ? (
        <section className="flex flex-col gap-2.5 rounded-xl border border-accent p-4">
          <h2 className="text-sm font-bold">{sub ? '成果を出し直す' : '成果を提出'}</h2>
          <SubmitForm
            declId={d.id}
            meId={me.id}
            again={Boolean(sub)}
            late={!sub && d.round_deadline !== null && todayJst() > d.round_deadline}
          />
        </section>
      ) : null}

      {mine ? (
        <section className="flex flex-col gap-2.5 rounded-xl bg-surface p-4">
          <h2 className="text-sm font-bold text-muted">報告する</h2>
          {d.status === 'doing' ? (
            <div className="flex gap-2">
              <StatusButton id={d.id} status="done" primary>
                達成した
              </StatusButton>
              <StatusButton id={d.id} status="miss">
                できなかった
              </StatusButton>
            </div>
          ) : (
            <StatusButton id={d.id} status="doing">
              挑戦中に戻す
            </StatusButton>
          )}
        </section>
      ) : null}

      {d.need ? (
        <section className="flex flex-col gap-2 rounded-xl border border-line p-4">
          <h2 className="text-sm font-bold text-muted">「{d.need}」に手を挙げた人</h2>
          <p className="text-sm leading-relaxed">
            手伝える：{helpers.length ? helpers.join('、') : 'まだいません'}
            <br />
            紹介できる：{introducers.length ? introducers.join('、') : 'まだいません'}
          </p>
        </section>
      ) : null}

      <section id="comments" className="flex scroll-mt-24 flex-col gap-2.5">
        <h2 className="text-sm font-bold text-muted">コメント・ツッコミ</h2>
        {comments.length === 0 ? <p className="text-sm text-faint">まだありません。</p> : null}
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2 rounded-md bg-surface px-3 py-2 text-sm leading-relaxed">
            <p className="min-w-0 flex-1 break-words">
              <span className="font-bold text-accent">{c.name}</span>　{c.body}
            </p>
            {c.member_id === me.id || mine ? <DeleteCommentButton id={c.id} /> : null}
          </div>
        ))}
        <CommentForm declId={d.id} placeholder={d.status === 'miss' ? 'なんでできなかったんだろうね？' : '応援・ツッコミを書く'} />
      </section>

      {mine ? (
        <form action={deleteDecl} className="mt-4 flex justify-center">
          <input type="hidden" name="id" value={d.id} />
          <button type="submit" className="min-h-11 px-3 text-xs text-faint underline underline-offset-2">
            この宣言を取り下げる
          </button>
        </form>
      ) : null}
    </>
  )
}
