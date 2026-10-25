import type { ReactNode } from 'react'
import { cx } from '../cx.ts'
import { Icon } from './Icon.tsx'

export interface RailProps {
  /** A collection, genre or duration band. */
  title: string
  /** «Ver todo». */
  actionLabel?: string
  actionHref?: string
  className?: string
  children: ReactNode
}

/** A titled, horizontally scrolling row of short cards, with snap. */
export function Rail({ title, actionLabel, actionHref, className, children }: RailProps) {
  return (
    <section aria-label={title} className={cx('grid gap-3 min-w-0', className)}>
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="m-0 font-display text-title uppercase">{title}</h2>
        {actionLabel ? (
          <a
            href={actionHref ?? '#'}
            className="inline-flex items-center gap-1 rounded-xs text-small-strong text-tungsteno-text no-underline focus-visible:focus-ring"
          >
            {actionLabel}
            <Icon name="arrow" size="xs" />
          </a>
        ) : null}
      </header>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pt-2 pb-3 *:snap-start *:flex-none">
        {children}
      </div>
    </section>
  )
}
