import { ImageResponse } from 'next/og'
import { IconArt } from '@/lib/icon-art'

// Android のホーム画面追加には 192px のアイコンも必要
export function GET() {
  return new ImageResponse(<IconArt size={192} />, { width: 192, height: 192 })
}
