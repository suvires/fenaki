import type { ReactNode } from 'react'
import { cx } from '../cx.ts'
import { Icon } from './Icon.tsx'

export interface RailProps {
  /** A collection, genre or duration band. */
  title: string
  /** «Ver todo»: read by screen readers after the title, which becomes the link. */
  actionLabel?: string
  /** The page with everything in the rail: the title links to it, with a chevron. */
  actionHref?: string
  className?: string
  children: ReactNode
}

/**
 * A titled, horizontally scrolling row of short cards, with snap. With `actionHref`, the title links
 * to the full list, with a chevron that moves a little to the right on hover and focus.
 */
export function Rail({ title, actionLabel, actionHref, className, children }: RailProps) {
  return (
    <section aria-label={title} className={cx('grid gap-3 min-w-0', className)}>
      <header>
        <h2 className="m-0 font-display text-title uppercase">
          {actionHref ? (
            <a
              href={actionHref}
              className="group inline-flex items-center gap-2 rounded-xs text-ink no-underline focus-visible:focus-ring"
            >
              {title}
              {actionLabel ? <span className="sr-only">, {actionLabel}</span> : null}
              <Icon
                name="chevron"
                weight="heavy"
                className="size-6 text-tungsteno transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none"
              />
            </a>
          ) : (
            title
          )}
        </h2>
      </header>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pt-2 pb-3 *:snap-start *:flex-none">
        {children}
      </div>
    </section>
  )
}
