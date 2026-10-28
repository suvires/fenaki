import { cx } from '../foundations/cx.ts'
import { Icon } from '../foundations/Icon.tsx'

export interface ActiveFilter {
  label: string
  /** The page without this value. */
  href: string
  /** Read by screen readers: «Quitar Terror». */
  removeLabel: string
}

export interface ActiveFiltersProps {
  /** Names the list for screen readers: «Filtros activos». */
  label: string
  filters: ActiveFilter[]
  /** The page with no filters, and its link text: «Quitar filtros». */
  clear: { label: string; href: string }
  className?: string
}

/** The chosen filter values as chips that each take one out, and a link that clears them all. */
export function ActiveFilters({ label, filters, clear, className }: ActiveFiltersProps) {
  if (filters.length === 0) return null
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      <ul aria-label={label} className="m-0 p-0 list-none flex flex-wrap gap-2">
        {filters.map((filter) => (
          <li key={filter.href}>
            <a
              href={filter.href}
              rel="nofollow"
              aria-label={filter.removeLabel}
              className={cx(
                'inline-flex items-center gap-2 h-(--chip-height) pl-4 pr-3 rounded-full border no-underline',
                'bg-inverse border-inverse text-on-inverse text-small-strong focus-visible:focus-ring',
              )}
            >
              <span>{filter.label}</span>
              <Icon name="close" size="sm" />
            </a>
          </li>
        ))}
      </ul>
      <a
        href={clear.href}
        className="px-2 text-small-strong text-primary underline underline-offset-4 hover:no-underline focus-visible:focus-ring"
      >
        {clear.label}
      </a>
    </div>
  )
}
