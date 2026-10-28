import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'

export type BadgeTone = 'neutral' | 'accent' | 'info' | 'branded'

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  tone?: BadgeTone
  /** `lg` next to body-size text (a short's page); `md` everywhere else. */
  size?: 'md' | 'lg'
  children: ReactNode
}

const TONES = {
  neutral: 'bg-muted text-primary',
  accent: 'bg-accent-subtle text-accent',
  info: 'bg-info-subtle text-info',
  /** «Contenido de marca»: the sponsored colour, because someone paid for it. Always shown, always first. */
  branded: 'bg-sponsored text-on-sponsored',
} as const

/** A one- or two-word fact about a short, in the uppercase timecode voice, as a pill. */
export function Badge({ tone = 'neutral', size = 'md', className, children, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={cx(
        'inline-flex items-center py-hair rounded-full font-mono uppercase',
        size === 'lg'
          ? 'min-h-(--badge-height-lg) px-4 text-label-l'
          : 'min-h-(--badge-height) px-3 text-label',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
