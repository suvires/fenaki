import { useId } from 'react'
import { cx } from '../cx.ts'

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
  className?: string
}

/**
 * One filter of the browse page as links, so every combination has a shareable URL and works
 * without JavaScript. Single choice: the selected option links back to the page without it.
 * Options with no matches are left out unless selected.
 */
export function FacetGroup({ label, options, countLabel, className }: FacetGroupProps) {
  const id = useId()
  const visible = options.filter((option) => option.selected || option.count !== 0)
  if (visible.length === 0) return null
  return (
    <section aria-labelledby={id} className={cx('grid gap-2', className)}>
      <h2 id={id} className="m-0 font-mono text-label uppercase text-ink-muted">
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
                'inline-flex items-center gap-2 h-(--size-chip) px-4 rounded-full border no-underline',
                'text-small-strong focus-visible:focus-ring',
                option.selected
                  ? 'bg-ink border-ink text-sala-0'
                  : 'bg-transparent border-line-strong text-ink hover:bg-sala-2',
              )}
            >
              <span>{option.label}</span>
              {option.count !== undefined ? (
                <span
                  className={cx(
                    'font-mono text-label-s',
                    option.selected ? 'text-sala-0' : 'text-ink-muted',
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
