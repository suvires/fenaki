import type { ReactNode } from 'react'
import { cx } from '../cx.ts'
import { Icon } from './Icon.tsx'
import { IconButton } from './IconButton.tsx'

export interface RailProps {
  /** A collection, genre or duration band. */
  title: string
  /** «Ver todo»: read by screen readers after the title, which becomes the link. */
  actionLabel?: string
  /** The page with everything in the rail: the title links to it, with a chevron. */
  actionHref?: string
  /**
   * The arrows that move the row one screen back and forth: their accessible names. The row is a
   * slider with them (they show on hover and keyboard focus, and only where there is more to see);
   * the page's script moves it (see `data-rail-*`). Touch screens still swipe it.
   */
  arrows?: { previous: string; next: string }
  className?: string
  children: ReactNode
}

// The arrow's place: centred on the row by a wrapper, so the button's own press (a small
// translate) never fights the centring.
const ARROW_SLOT = 'absolute top-1/2 z-10 -translate-y-1/2'
const ARROW = cx(
  'transition-opacity duration-(--duration-press) ease-standard motion-reduce:transition-none',
  // Shown on the row's hover and on focus, and only where the row can move.
  'opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100',
)

/**
 * A titled row of short cards, with snap. With `arrows` it is a slider: no scrollbar, and two
 * chevron buttons move it one screen back and forth. With `actionHref`, the title links to the full
 * list, with a chevron that moves a little to the right on hover and focus.
 */
export function Rail({ title, actionLabel, actionHref, arrows, className, children }: RailProps) {
  return (
    <section
      aria-label={title}
      data-rail={arrows ? '' : undefined}
      className={cx('group/rail grid gap-3 min-w-0', className)}
    >
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
      <div className="relative min-w-0">
        {/* As tall as its cards: nothing scrolls or reserves room vertically. The padding, given back
            by the negative margin, only keeps focus rings and shadows from being clipped. */}
        <div
          data-rail-track={arrows ? '' : undefined}
          className={cx(
            'flex gap-4 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-pl-4 -mx-4 px-4 -my-1 py-1 *:snap-start *:flex-none',
            arrows && '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {children}
        </div>
        {arrows ? (
          <>
            <span className={cx(ARROW_SLOT, 'left-2')}>
              <IconButton
                icon="chevron"
                label={arrows.previous}
                variant="veil"
                size="lg"
                data-rail-previous=""
                className={cx(ARROW, 'rotate-180 invisible group-data-can-previous/rail:visible')}
              />
            </span>
            <span className={cx(ARROW_SLOT, 'right-2')}>
              <IconButton
                icon="chevron"
                label={arrows.next}
                variant="veil"
                size="lg"
                data-rail-next=""
                className={cx(ARROW, 'invisible group-data-can-next/rail:visible')}
              />
            </span>
          </>
        ) : null}
      </div>
    </section>
  )
}
