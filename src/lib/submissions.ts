import 'server-only'
import { del } from '@vercel/blob'
import { db } from './db'

export const MAX_PHOTOS = 3
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_PDF_BYTES = 20 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PDF_TYPE = 'application/pdf'

/** その人がその宣言の成果を置ける場所。アップロードと提出の両方でこの下だけを許す */
export const uploadPrefix = (memberId: string, declId: string) => `submissions/${memberId}/${declId}/`

export type SubmissionFile = { id: string; content_type: string; size: number }

export type Submission = {
  body: string
  created_at: string
  /** ひも付いたラウンドの締め切りより後に初めて提出した */
  late: boolean
  photos: SubmissionFile[]
  pdf: SubmissionFile | null
}

/** 宣言ごとの提出（ボード・詳細・報告で使う） */
export async function submissionsFor(declIds: string[]): Promise<Map<string, Submission>> {
  const out = new Map<string, Submission>()
  if (declIds.length === 0) return out
  const sql = await db()
  const rows = (await sql`
    select s.decl_id, s.body, s.created_at,
      coalesce((s.created_at at time zone 'Asia/Tokyo')::date > r.deadline, false) as late,
      coalesce((
        select json_agg(json_build_object('id', f.id, 'content_type', f.content_type, 'size', f.size) order by f.position)
        from submission_files f where f.decl_id = s.decl_id
      ), '[]'::json) as files
    from submissions s
    join declarations d on d.id = s.decl_id
    left join rounds r on r.id = d.round_id
    where s.decl_id = any(${declIds}::uuid[])
  `) as { decl_id: string; body: string; created_at: string; late: boolean; files: SubmissionFile[] }[]
  for (const r of rows) {
    out.set(r.decl_id, {
      body: r.body,
      created_at: r.created_at,
      late: r.late,
      photos: r.files.filter((f) => f.content_type.startsWith('image/')),
      pdf: r.files.find((f) => f.content_type === PDF_TYPE) ?? null,
    })
  }
  return out
}

/** Blob からファイルを消す。失敗しても画面の操作は止めない（ログに残す） */
export async function deleteBlobs(pathnames: string[]) {
  if (pathnames.length === 0) return
  try {
    await del(pathnames)
  } catch (e) {
    console.error('blob delete failed', (e as Error).message)
  }
}
