import { NextResponse, type NextRequest } from 'next/server'

// 楽観チェックだけ。本当の検証は各ページとサーバーアクションで行う。
export function proxy(request: NextRequest) {
  if (!request.cookies.has('bh_session')) {
    return NextResponse.redirect(new URL('/join', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!join|_next|favicon.ico|icon|apple-icon|manifest.webmanifest).*)'],
}
