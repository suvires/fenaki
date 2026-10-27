import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'

export type BadgeTone = 'neutral' | 'accent' | 'info' | 'branded'

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  tone?: BadgeTone
  children: ReactNode
}

const TONES = {
  neutral: 'bg-muted text-primary',
  accent: 'bg-accent-subtle text-accent',
  info: 'bg-info-subtle text-info',
  /** «Contenido de marca»: the sponsored colour, because someone paid for it. Always shown, always first. */
  branded: 'bg-sponsored text-on-sponsored',
} as const

/** A one- or two-word fact about a short, in the uppercase timecode voice. */
export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={cx(
        'inline-flex items-center min-h-(--badge-height) px-2 py-hair rounded-xs font-mono text-label uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
