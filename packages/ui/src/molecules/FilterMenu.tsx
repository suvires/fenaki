import type { ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'
import { Icon } from '../foundations/Icon.tsx'
import type { FacetOption } from './FacetGroup.tsx'

export interface FilterMenuProps {
  /** Anchor of the menu: options link back to it, so the page that loads opens it again. */
  id: string
  /** The filter's name: «Género». */
  label: string
  /** How many of its values are chosen, shown next to the name. */
  selected?: number
  /** Which edge of the button the panel lines up with. */
  align?: 'start' | 'end'
  /** Rendered open: the page reopens the menu a link came from; stories show the panel. */
  defaultOpen?: boolean
  /** The panel: a FilterOptions list, or several sections («Más filtros»). */
  children: ReactNode
  className?: string
}

/** The chip that opens a menu: filled once any of its values is chosen. */
export function menuButtonClass(selected: number) {
  return cx(
    'list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-2',
    'h-(--chip-height) px-4 rounded-full border cursor-pointer text-small-strong whitespace-nowrap',
    'focus-visible:focus-ring',
    selected > 0
      ? 'bg-inverse border-inverse text-on-inverse'
      : 'bg-transparent border-strong text-primary hover:bg-muted',
  )
}

/**
 * One filter of the FilterBar as a dropdown. A native disclosure (`<details>`), so it opens and
 * closes without JavaScript; the page adds closing on Escape and on a click outside.
 */
export function FilterMenu({
  id,
  label,
  selected = 0,
  align = 'start',
  defaultOpen = false,
  children,
  className,
}: FilterMenuProps) {
  return (
    <details
      id={id}
      open={defaultOpen || undefined}
      data-filter-menu=""
      className={cx('group relative', className)}
    >
      <summary className={menuButtonClass(selected)}>
        <span>{label}</span>
        {selected > 0 ? <span className="font-mono text-label-s">{selected}</span> : null}
        <Icon
          name="chevron-down"
          size="sm"
          className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div
        className={cx(
          'absolute top-full z-10 mt-2 p-2 min-w-(--size-column) max-h-(--filter-menu-max-height)',
          'overflow-y-auto rounded-sm bg-raised border border-subtle shadow-lg',
          align === 'end' ? 'right-0' : 'left-0',
        )}
      >
        {children}
      </div>
    </details>
  )
}

export interface FilterOptionsProps {
  /** Names the list for screen readers, and shows as a heading when `heading` is set. */
  label: string
  heading?: boolean
  options: FacetOption[]
  countLabel?: (count: number) => string
  className?: string
}

/**
 * The options inside a FilterMenu, as links with a check when chosen. Options with no matches
 * are left out unless chosen.
 */
export function FilterOptions({
  label,
  heading = false,
  options,
  countLabel,
  className,
}: FilterOptionsProps) {
  const visible = options.filter((option) => option.selected || option.count !== 0)
  if (visible.length === 0) return null
  return (
    <div className={cx('grid gap-1', className)}>
      {heading ? (
        <p
          aria-hidden="true"
          className="m-0 px-2 pt-2 font-mono text-label uppercase text-secondary"
        >
          {label}
        </p>
      ) : null}
      <ul aria-label={label} className="m-0 p-0 list-none grid">
        {visible.map((option) => (
          <li key={option.href}>
            <a
              href={option.href}
              aria-current={option.selected ? 'true' : undefined}
              rel="nofollow"
              className={cx(
                'flex items-center gap-3 px-2 py-2 rounded-sm no-underline text-small text-primary',
                'hover:bg-muted focus-visible:focus-ring',
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'inline-flex items-center justify-center size-(--size-icon-md) rounded-xs border',
                  option.selected ? 'bg-inverse border-inverse text-on-inverse' : 'border-strong',
                )}
              >
                {option.selected ? <Icon name="check" size="sm" /> : null}
              </span>
              <span className="flex-1 whitespace-nowrap">{option.label}</span>
              {option.count !== undefined ? (
                <span
                  className="font-mono text-label-s text-secondary"
                  aria-label={countLabel?.(option.count)}
                >
                  {option.count}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
