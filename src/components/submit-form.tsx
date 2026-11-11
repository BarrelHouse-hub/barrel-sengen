'use client'
/* eslint-disable @next/next/no-img-element -- 端末で選んだ写真のプレビュー（blob: の URL）なので next/image を通さない */

import { upload } from '@vercel/blob/client'
import { useEffect, useRef, useState } from 'react'
import { submitResult } from '@/app/actions'

const MAX_PHOTOS = 3
const LONG_SIDE = 1600
const MAX_PDF_MB = 20

/** 写真を長辺1600pxまで縮めて JPEG にする（通信量と保存量を減らす） */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, LONG_SIDE / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.85))
}

const field = 'rounded-lg border border-line2 bg-surface px-3 text-base text-ink focus:border-accent focus:outline-none'
const label = 'text-xs font-bold text-muted'

export function SubmitForm({ declId, meId, again, late }: { declId: string; meId: string; again: boolean; late: boolean }) {
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([])
  const urls = useRef<string[]>([])
  const [pdf, setPdf] = useState<File | null>(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // プレビュー用の URL は、選び直したときと画面を離れるときに片付ける
  const setPicked = (files: File[]) => {
    urls.current.forEach((u) => URL.revokeObjectURL(u))
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }))
    urls.current = next.map((p) => p.url)
    setPhotos(next)
  }
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), [])

  function pickPhotos(list: FileList | null) {
    setError(null)
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith('image/') || f.type === '')
    if (files.length > MAX_PHOTOS) setError(`写真は${MAX_PHOTOS}枚までです。最初の${MAX_PHOTOS}枚を使います。`)
    setPicked(files.slice(0, MAX_PHOTOS))
  }

  function pickPdf(list: FileList | null) {
    setError(null)
    const f = list?.[0] ?? null
    if (f && f.type !== 'application/pdf') return setError('PDF を選んでください。')
    if (f && f.size > MAX_PDF_MB * 1024 * 1024) return setError(`PDF は${MAX_PDF_MB}MBまでです。`)
    setPdf(f)
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    if (!body.trim() && photos.length === 0 && !pdf) return setError('ひとことか、写真・PDF を入れてください。')
    setError(null)
    setDone(false)
    const prefix = `submissions/${meId}/${declId}/`
    const opts = { access: 'private' as const, handleUploadUrl: '/api/upload' }
    try {
      const files: { pathname: string }[] = []
      for (let i = 0; i < photos.length; i++) {
        setBusy(`写真を送っています（${i + 1}/${photos.length}）…`)
        let small: Blob
        try {
          small = await shrink(photos[i].file)
        } catch {
          throw new Error('読み込めない写真がありました。JPEG か PNG の写真を選んでください。')
        }
        const r = await upload(`${prefix}photo${i + 1}.jpg`, small, { ...opts, contentType: 'image/jpeg' })
        files.push({ pathname: r.pathname })
      }
      if (pdf) {
        setBusy('PDF を送っています…')
        const r = await upload(`${prefix}doc.pdf`, pdf, { ...opts, contentType: 'application/pdf' })
        files.push({ pathname: r.pathname })
      }
      setBusy('提出しています…')
      const res = await submitResult(declId, { body, files })
      if (res.error) throw new Error(res.error)
      setPicked([])
      form.reset()
      setPdf(null)
      setBody('')
      setDone(true)
    } catch (err) {
      setError((err as Error).message || '送れませんでした。電波のよいところでもう一度試してください。')
    } finally {
      setBusy(null)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {late ? <p className="text-xs leading-relaxed text-accent">ラウンドの締め切りを過ぎているので「遅れて提出」と表示されます。</p> : null}
      {again ? <p className="text-xs leading-relaxed text-muted">出し直すと、ひとこと・写真・PDF はすべて差し替わります。</p> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sub-photos" className={label}>写真（{MAX_PHOTOS}枚まで）</label>
        <input id="sub-photos" type="file" accept="image/*" multiple onChange={(e) => pickPhotos(e.target.files)} className="text-sm text-muted file:mr-3 file:min-h-10 file:rounded-lg file:border file:border-line2 file:bg-surface file:px-3 file:text-sm file:font-bold file:text-ink" />
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map(({ url: u }) => (
              <img key={u} src={u} alt="選んだ写真" className="aspect-square w-full rounded object-cover" />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sub-pdf" className={label}>PDF（1つ・任意）</label>
        <input id="sub-pdf" type="file" accept="application/pdf" onChange={(e) => pickPdf(e.target.files)} className="text-sm text-muted file:mr-3 file:min-h-10 file:rounded-lg file:border file:border-line2 file:bg-surface file:px-3 file:text-sm file:font-bold file:text-ink" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sub-body" className={label}>ひとこと</label>
        <textarea id="sub-body" rows={3} maxLength={300} value={body} onChange={(e) => setBody(e.target.value)} placeholder="やってみてどうだった？" className={`${field} resize-none py-3 leading-relaxed`} />
      </div>

      <p className="text-xs leading-relaxed text-muted" aria-live="polite" role={error ? 'alert' : undefined}>
        {error ? <span className="text-accent">{error}</span> : busy ?? (done ? '提出しました。ボードに並びます。' : '提出すると、この宣言は「達成」で報告済みになります。')}
      </p>

      <button type="submit" disabled={busy !== null} className="min-h-12 rounded-xl bg-accent text-base font-bold text-ground disabled:bg-line disabled:text-muted">
        {busy ? '送っています…' : again ? '出し直す' : '成果を提出する'}
      </button>
    </form>
  )
}
