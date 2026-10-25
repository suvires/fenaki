import { Children, type ReactNode } from 'react'
import { cx } from '../cx.ts'

export interface ShortGridProps {
  /** Accessible name of the list, when the page has more than one. */
  label?: string
  /** Short cards, each with `stretch`. */
  children: ReactNode
  className?: string
}

/** Short cards in a responsive grid: a collection, a showcase, a person's shorts, results. */
export function ShortGrid({ label, children, className }: ShortGridProps) {
  return (
    <ul
      aria-label={label}
      className={cx(
        'm-0 p-0 list-none grid grid-cols-[repeat(auto-fill,minmax(var(--size-card),1fr))] gap-4',
        className,
      )}
    >
      {Children.map(children, (child) => (child ? <li>{child}</li> : null))}
    </ul>
  )
}
