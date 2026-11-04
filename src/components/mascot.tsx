import { MASCOT_NAME } from '@/lib/mascot-name'

/** たるまる（仮）：琥珀色の樽の子。 */
export function Mascot({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={MASCOT_NAME} className={`shrink-0 ${className}`}>
      <ellipse cx="32" cy="60" rx="16" ry="2.5" fill="#000" opacity="0.3" />
      <path d="M14 14 Q9 33 14 52 Q32 58 50 52 Q55 33 50 14 Z" fill="#a86b3c" stroke="#2b211a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M23 12 Q20 33 23 55 M41 12 Q44 33 41 55" fill="none" stroke="#8a5530" strokeWidth="1.5" />
      <path d="M12 23 Q32 29 52 23" fill="none" stroke="#2b211a" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 44 Q32 50 52 44" fill="none" stroke="#2b211a" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="32" cy="14" rx="18" ry="5" fill="#c98a55" stroke="#2b211a" strokeWidth="2" />
      <ellipse cx="32" cy="12.5" rx="9" ry="2" fill="#e0a34e" opacity="0.7" />
      <circle cx="25" cy="33" r="2.4" fill="#2b211a" />
      <circle cx="39" cy="33" r="2.4" fill="#2b211a" />
      <circle cx="25.8" cy="32.2" r="0.8" fill="#f4ecdf" />
      <circle cx="39.8" cy="32.2" r="0.8" fill="#f4ecdf" />
      <ellipse cx="20.5" cy="37.5" rx="2.6" ry="1.6" fill="#e0a34e" opacity="0.75" />
      <ellipse cx="43.5" cy="37.5" rx="2.6" ry="1.6" fill="#e0a34e" opacity="0.75" />
      <path d="M28.5 37.5 Q32 41 35.5 37.5" fill="none" stroke="#2b211a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11.5 34 Q6 31 7 26" fill="none" stroke="#2b211a" strokeWidth="2" strokeLinecap="round" />
      <path d="M52.5 34 Q58 31 57 26" fill="none" stroke="#2b211a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Bubble({ children, tone = 'paper' }: { children: React.ReactNode; tone?: 'paper' | 'dark' }) {
  const color = tone === 'paper' ? 'bg-paper text-paper-ink' : 'bg-surface text-ink border border-line'
  return (
    <div className={`relative flex-1 rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${color}`}>
      <span
        aria-hidden="true"
        className={`absolute top-5 -left-1.5 size-3 rotate-45 ${tone === 'paper' ? 'bg-paper' : 'border-b border-l border-line bg-surface'}`}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
