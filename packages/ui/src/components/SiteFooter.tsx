import { cx } from '../cx.ts'
import { Monogram } from './Monogram.tsx'

export interface SiteFooterProps {
  /** Accessible name of the footer navigation. */
  label: string
  links: { label: string; href: string }[]
  /** Accessible name of the monogram: the brand name. */
  brand: string
  className?: string
}

/** The footer on every page: the monogram and a column of links (legal pages and credits always among them). */
export function SiteFooter({ label, links, brand, className }: SiteFooterProps) {
  return (
    <footer className={cx('grid gap-8 pt-8', className)}>
      <div className="grid gap-8 md:grid-cols-[1fr_auto]">
        <div className="grid content-start gap-4">
          <Monogram
            label={brand}
            className="h-12 w-auto self-start justify-self-start text-tungsteno"
          />
        </div>
        <nav aria-label={label} className="content-start md:justify-self-end">
          <ul className="m-0 p-0 list-none grid gap-2">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-small text-ink underline underline-offset-4 hover:no-underline rounded-xs focus-visible:focus-ring"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
