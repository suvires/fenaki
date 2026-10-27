import { cx } from '../foundations/cx.ts'
import { Monogram } from '../foundations/Monogram.tsx'

export interface SiteFooterLink {
  label: string
  href: string
}

export interface SiteFooterProps {
  /** Accessible name of the footer navigation. */
  label: string
  /** One column per group, in order; the last one holds the legal pages and credits. */
  groups: SiteFooterLink[][]
  /** Accessible name of the monogram: the brand name. */
  brand: string
  className?: string
}

/** The footer on every page: the monogram and the links in columns (legal pages and credits always among them). */
export function SiteFooter({ label, groups, brand, className }: SiteFooterProps) {
  return (
    <footer className={cx('grid gap-8 pt-8', className)}>
      <div className="grid gap-8 md:grid-cols-[1fr_auto]">
        <div className="grid content-start gap-4">
          <Monogram
            label={brand}
            className="h-12 w-auto self-start justify-self-start text-accent"
          />
        </div>
        <nav
          aria-label={label}
          className="grid content-start gap-6 md:grid-flow-col md:auto-cols-max md:gap-12 md:justify-self-end"
        >
          {groups.map((links, index) => (
            <ul key={index} className="m-0 p-0 list-none grid content-start gap-2">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-small text-primary no-underline hover:text-accent rounded-xs focus-visible:focus-ring"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </nav>
      </div>
    </footer>
  )
}
