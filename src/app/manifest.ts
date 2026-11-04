import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'バレルハウス 宣言ボード',
    short_name: '宣言ボード',
    description: 'やりたいことを宣言して、飲みながら報告する。',
    start_url: '/',
    display: 'standalone',
    background_color: '#17120e',
    theme_color: '#17120e',
    lang: 'ja',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
