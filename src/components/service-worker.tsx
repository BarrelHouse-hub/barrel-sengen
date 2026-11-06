'use client'

import { useEffect } from 'react'

export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((e) => {
      console.error('Service Worker の登録に失敗', e)
    })
  }, [])
  return null
}
