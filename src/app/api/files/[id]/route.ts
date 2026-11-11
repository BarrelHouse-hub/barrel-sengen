import { get } from '@vercel/blob'
import { db } from '@/lib/db'
import { getMe } from '@/lib/session'

// 成果物のファイルを、ログインしている人にだけ返す（Blob は非公開なので URL を直接は渡さない）
export async function GET(request: Request, ctx: RouteContext<'/api/files/[id]'>) {
  const me = await getMe()
  if (!me) return new Response('Unauthorized', { status: 401 })
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 })
  const sql = await db()
  const rows = (await sql`select pathname, content_type from submission_files where id = ${id}`) as {
    pathname: string
    content_type: string
  }[]
  const f = rows[0]
  if (!f) return new Response('Not found', { status: 404 })

  const ifNoneMatch = request.headers.get('if-none-match') ?? undefined
  const blob = await get(f.pathname, { access: 'private', ifNoneMatch })
  if (!blob) return new Response('Not found', { status: 404 })
  const headers = new Headers({
    'Content-Type': f.content_type,
    // 端末のブラウザにだけ置いてよい（共有のキャッシュには置かない）
    'Cache-Control': 'private, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    ETag: blob.blob.etag,
  })
  if (blob.statusCode === 304) return new Response(null, { status: 304, headers })
  if (f.content_type === 'application/pdf') headers.set('Content-Disposition', 'inline; filename="seika.pdf"')
  return new Response(blob.stream, { headers })
}
