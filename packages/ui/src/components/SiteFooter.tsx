import { cx } from '../cx.ts'
import { Monogram } from './Monogram.tsx'

export interface SiteFooterProps {
  /** Accessible name of the footer navigation. */
  label: string
  groups: { title: string; links: { label: string; href: string }[] }[]
  /** The closing line under the links, after the brand's monogram. */
  tagline: string
  /** Accessible name of the monogram: the brand name. */
  brand: string
  className?: string
}

/** The footer on every page: the monogram and the motto, and grouped links (legal pages and credits always among them). */
export function SiteFooter({ label, groups, tagline, brand, className }: SiteFooterProps) {
  return (
    <footer className={cx('grid gap-8 pt-8 border-t border-line', className)}>
      <div className="grid gap-8 md:grid-cols-[var(--size-card)_1fr]">
        <div className="grid content-start gap-3">
          <Monogram
            label={brand}
            className="h-12 w-auto self-start justify-self-start text-tungsteno"
          />
          <p className="m-0 text-meta text-ink-muted">{tagline}</p>
        </div>
        <nav
          aria-label={label}
          className="grid grid-cols-[repeat(auto-fit,minmax(var(--size-card),1fr))] gap-6"
        >
          {groups.map((group) => (
            <div key={group.title} className="grid content-start gap-2">
              <h2 className="m-0 font-mono text-label uppercase text-ink-muted">{group.title}</h2>
              <ul className="m-0 p-0 list-none grid gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-small text-ink no-underline hover:underline underline-offset-4 rounded-xs focus-visible:focus-ring"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  )
}
