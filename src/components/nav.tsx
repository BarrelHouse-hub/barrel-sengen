'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  {
    href: '/',
    label: 'ボード',
    icon: (
      <>
        <rect x="3" y="3" width="8" height="10" rx="1" />
        <rect x="13" y="3" width="8" height="6" rx="1" />
        <rect x="13" y="11" width="8" height="10" rx="1" />
        <rect x="3" y="15" width="8" height="6" rx="1" />
      </>
    ),
  },
  {
    href: '/new',
    label: '宣言する',
    icon: (
      <>
        <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
        <path d="M14 7l3 3" />
      </>
    ),
  },
  {
    href: '/help',
    label: '力を貸して',
    icon: (
      <>
        <path d="M7 11V5a1.5 1.5 0 0 1 3 0v5" />
        <path d="M10 10V4a1.5 1.5 0 0 1 3 0v6" />
        <path d="M13 10V5a1.5 1.5 0 0 1 3 0v6" />
        <path d="M16 11V8a1.5 1.5 0 0 1 3 0v5a8 8 0 0 1-8 8h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.6L7 14" />
      </>
    ),
  },
  {
    href: '/report',
    label: '報告',
    icon: (
      <>
        <path d="M8 21h8M12 17v4" />
        <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
        <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
      </>
    ),
  },
]

export function Nav() {
  return <NavBar path={usePathname()} />
}

export function NavBar({ path }: { path: string | null }) {
  return (
    <nav
      aria-label="メインメニュー"
      className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-line bg-deep px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),10px)]"
    >
      {items.map((it) => {
        const active = path == null ? false : it.href === '/' ? path === '/' || path.startsWith('/d/') || path.startsWith('/mascot') : path.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-bold ${active ? 'text-accent' : 'text-muted'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {it.icon}
            </svg>
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}
