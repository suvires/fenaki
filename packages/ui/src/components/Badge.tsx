import type { ReactNode } from 'react'
import { cx } from '../cx.ts'

export type BadgeTone = 'neutral' | 'accent' | 'info' | 'branded'

export interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

const TONES = {
  neutral: 'bg-sala-2 text-ink',
  accent: 'bg-tungsteno-soft text-tungsteno-text',
  info: 'bg-plata-soft text-plata',
  /** «Contenido de marca»: telon, because someone paid for it. Always shown, always first. */
  branded: 'bg-telon text-on-telon',
} as const

/** A one- or two-word fact about a short, in the uppercase timecode voice. */
export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center min-h-(--size-badge) px-2 py-hair rounded-xs font-mono text-label uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
