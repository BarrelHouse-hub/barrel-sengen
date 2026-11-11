import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { db } from '@/lib/db'
import { getMe } from '@/lib/session'
import { MAX_PDF_BYTES, MAX_PHOTO_BYTES, PDF_TYPE, PHOTO_TYPES, uploadPrefix } from '@/lib/submissions'

// 成果物のアップロード用の一時トークンを出す。ファイルはブラウザから Vercel Blob（非公開）へ直接送られる。
// 自分の宣言の置き場（submissions/自分/宣言/）にだけ置ける。
export async function POST(request: Request) {
  const me = await getMe()
  if (!me) return Response.json({ error: 'ログインしてください' }, { status: 401 })
  const body = (await request.json()) as HandleUploadBody
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const m = /^submissions\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/[A-Za-z0-9_-]{1,40}\.(jpg|pdf)$/.exec(pathname)
        if (!m || m[1] !== me.id) throw new Error('置けない場所です')
        const sql = await db()
        const own = (await sql`select 1 from declarations where id = ${m[2]} and member_id = ${me.id}`) as unknown[]
        if (own.length === 0 || !pathname.startsWith(uploadPrefix(me.id, m[2]))) throw new Error('自分の宣言にだけ提出できます')
        const pdf = m[3] === 'pdf'
        return {
          allowedContentTypes: pdf ? [PDF_TYPE] : PHOTO_TYPES,
          maximumSizeInBytes: pdf ? MAX_PDF_BYTES : MAX_PHOTO_BYTES,
          addRandomSuffix: true,
        }
      },
    })
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 })
  }
}
