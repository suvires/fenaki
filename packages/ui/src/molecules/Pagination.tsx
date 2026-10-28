import { IconButton } from '../atoms/IconButton.tsx'
import { cx } from '../foundations/cx.ts'

export interface PaginationProps {
  /** Accessible name of the navigation: «Páginas». */
  label: string
  /** The page shown, from 1. */
  page: number
  pages: number
  /** The address of a page. */
  href: (page: number) => string
  /** The arrows' accessible names: «Anterior», «Siguiente». */
  previousLabel: string
  nextLabel: string
  /** A number's accessible name: «Página 3». */
  pageLabel: (page: number) => string
  className?: string
}

/** How many page numbers show on each side of the current one. */
const AROUND = 2

/**
 * Previous and next arrows under a long list, with the current page and the two before and after
 * it as numbers. Plain links: every page has its own URL.
 */
export function Pagination({
  label,
  page,
  pages,
  href,
  previousLabel,
  nextLabel,
  pageLabel,
  className,
}: PaginationProps) {
  const first = Math.max(1, page - AROUND)
  const last = Math.min(pages, page + AROUND)
  const numbers = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  const number =
    'inline-flex items-center justify-center min-w-(--control-height-md) h-(--control-height-md) px-2 rounded-full text-button-md no-underline'
  return (
    <nav aria-label={label} className={cx('flex flex-wrap items-center gap-2', className)}>
      {page > 1 ? (
        <IconButton
          icon="chevron"
          label={previousLabel}
          href={href(page - 1)}
          className="rotate-180"
        />
      ) : null}
      <ol className="m-0 p-0 list-none flex items-center gap-1">
        {numbers.map((n) => (
          <li key={n}>
            {n === page ? (
              <span aria-current="page" className={cx(number, 'bg-accent text-on-accent')}>
                <span className="sr-only">{pageLabel(n)}</span>
                <span aria-hidden="true">{n}</span>
              </span>
            ) : (
              <a
                href={href(n)}
                aria-label={pageLabel(n)}
                className={cx(
                  number,
                  'text-primary hover:bg-translucent/(--opacity-translucent-hover) focus-visible:focus-ring',
                )}
              >
                {n}
              </a>
            )}
          </li>
        ))}
      </ol>
      {page < pages ? <IconButton icon="chevron" label={nextLabel} href={href(page + 1)} /> : null}
    </nav>
  )
}
