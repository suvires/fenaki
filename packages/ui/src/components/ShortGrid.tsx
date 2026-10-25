import { cx } from '../cx.ts'
import { ShortCard, type ShortCardProps } from './ShortCard.tsx'

export interface ShortGridProps {
  /** Accessible name of the list, when the page has more than one. */
  label?: string
  /** The cards, as data: Astro passes children to React as one block, so the grid renders them. */
  items: Omit<ShortCardProps, 'stretch'>[]
  className?: string
}

/** Short cards in a responsive grid: a collection, a showcase, a person's shorts, results. */
export function ShortGrid({ label, items, className }: ShortGridProps) {
  return (
    <ul
      aria-label={label}
      className={cx(
        'm-0 p-0 list-none grid grid-cols-[repeat(auto-fill,minmax(var(--size-card),1fr))] gap-4',
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.href ?? item.title}>
          <ShortCard {...item} stretch />
        </li>
      ))}
    </ul>
  )
}
