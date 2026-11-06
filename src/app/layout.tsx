import type { Metadata, Viewport } from 'next'
import { Yuji_Syuku, Zen_Kaku_Gothic_New } from 'next/font/google'
import { ServiceWorker } from '@/components/service-worker'
import './globals.css'

const hand = Yuji_Syuku({ weight: '400', subsets: ['latin'], preload: false, variable: '--font-hand-src' })
const ui = Zen_Kaku_Gothic_New({ weight: ['400', '500', '700'], subsets: ['latin'], preload: false, variable: '--font-ui' })

export const metadata: Metadata = {
  title: 'バレルハウス 宣言ボード',
  description: 'やりたいことを宣言して、飲みながら報告する。',
  appleWebApp: { capable: true, title: '宣言ボード', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#17120e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ja" className={`${hand.variable} ${ui.variable} antialiased`}>
      <body className="font-sans">
        <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-ground">{children}</div>
        <ServiceWorker />
      </body>
    </html>
  )
}
