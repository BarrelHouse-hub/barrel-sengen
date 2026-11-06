import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'バレルハウス 宣言ボード',
    short_name: '宣言ボード',
    description: 'やりたいことを宣言して、飲みながら報告する。',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#17120e',
    theme_color: '#17120e',
    lang: 'ja',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
