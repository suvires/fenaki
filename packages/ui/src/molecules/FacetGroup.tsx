import { useId } from 'react'
import { cx } from '../foundations/cx.ts'

export interface FacetOption {
  label: string
  /** The page with this option toggled: selecting it, or clearing it when it is selected. */
  href: string
  /** Shorts that match with this option, given the other filters. */
  count?: number
  selected?: boolean
}

export interface FacetGroupProps {
  /** The filter's name: «Duración». */
  label: string
  options: FacetOption[]
  /** Read with each count by screen readers: «{count} cortos» is built by the caller. */
  countLabel?: (count: number) => string
  /** Anchor of the section, so a link can come back to it (the FilterBar's sheet). */
  id?: string
  className?: string
}

/**
 * One filter of the browse page as links, so every combination has a shareable URL and works
 * without JavaScript. Each option links to the page with it added, or taken out when selected.
 * Options with no matches are left out unless selected.
 */
export function FacetGroup({ label, options, countLabel, id, className }: FacetGroupProps) {
  const headingId = useId()
  const visible = options.filter((option) => option.selected || option.count !== 0)
  if (visible.length === 0) return null
  return (
    <section id={id} aria-labelledby={headingId} className={cx('grid gap-2', className)}>
      <h2 id={headingId} className="m-0 font-mono text-label uppercase text-secondary">
        {label}
      </h2>
      <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
        {visible.map((option) => (
          <li key={option.href}>
            <a
              href={option.href}
              aria-current={option.selected ? 'true' : undefined}
              rel="nofollow"
              className={cx(
                'inline-flex items-center gap-2 h-(--chip-height) px-4 rounded-full border no-underline',
                'text-small-strong focus-visible:focus-ring',
                option.selected
                  ? 'bg-inverse border-inverse text-on-inverse'
                  : 'bg-transparent border-strong text-primary hover:bg-muted',
              )}
            >
              <span>{option.label}</span>
              {option.count !== undefined ? (
                <span
                  className={cx(
                    'font-mono text-label-s',
                    option.selected ? 'text-on-inverse' : 'text-secondary',
                  )}
                  aria-label={countLabel?.(option.count)}
                >
                  {option.count}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
