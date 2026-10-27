import type { ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'
import { ShortCard, type ShortCardProps } from '../molecules/ShortCard.tsx'

export interface ShortGridProps {
  /** Accessible name of the list, when the page has more than one. */
  label?: string
  /** The cards, as data: Astro passes children to React as one block, so the grid renders them. */
  items: Omit<ShortCardProps, 'stretch'>[]
  /** Something under each card, such as «Quitar del historial». */
  footer?: (item: Omit<ShortCardProps, 'stretch'>, index: number) => ReactNode
  className?: string
}

/** Short cards in a responsive grid: a collection, a showcase, a person's shorts, results. */
export function ShortGrid({ label, items, footer, className }: ShortGridProps) {
  return (
    <ul
      aria-label={label}
      className={cx(
        'm-0 p-0 list-none grid grid-cols-[repeat(auto-fill,minmax(var(--short-card-width),1fr))] gap-4',
        className,
      )}
    >
      {items.map((item, index) => (
        <li
          key={item.href ?? item.title}
          className={footer ? 'grid gap-2 content-start' : undefined}
        >
          <ShortCard {...item} stretch />
          {footer?.(item, index)}
        </li>
      ))}
    </ul>
  )
}
