import { cx } from '../foundations/cx.ts'
import { Icon } from '../foundations/Icon.tsx'

export interface PaginationProps {
  /** Accessible name of the navigation: «Páginas». */
  label: string
  /** «Página 2 de 5». */
  status: string
  previous?: { href: string; label: string }
  next?: { href: string; label: string }
  className?: string
}

/** Previous and next links under a long list. Plain links: every page has its own URL. */
export function Pagination({ label, status, previous, next, className }: PaginationProps) {
  const link =
    'inline-flex items-center gap-2 h-(--control-height-md) px-4 rounded-sm border border-strong bg-muted text-button-md text-primary no-underline hover:bg-raised focus-visible:focus-ring'
  return (
    <nav aria-label={label} className={cx('flex flex-wrap items-center gap-4', className)}>
      {previous ? (
        <a href={previous.href} rel="prev" className={link}>
          <Icon name="arrow" size="sm" className="rotate-180" />
          <span>{previous.label}</span>
        </a>
      ) : null}
      <p className="m-0 font-mono text-label uppercase text-secondary">{status}</p>
      {next ? (
        <a href={next.href} rel="next" className={link}>
          <span>{next.label}</span>
          <Icon name="arrow" size="sm" />
        </a>
      ) : null}
    </nav>
  )
}
