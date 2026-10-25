import { cx } from '../cx.ts'

export interface SiteFooterProps {
  /** Accessible name of the footer navigation. */
  label: string
  groups: { title: string; links: { label: string; href: string }[] }[]
  /** The closing line under the links. */
  tagline: string
  className?: string
}

/** The footer on every page: grouped links (legal pages always among them) and the tagline. */
export function SiteFooter({ label, groups, tagline, className }: SiteFooterProps) {
  return (
    <footer className={cx('grid gap-8 pt-8 border-t border-line', className)}>
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
      <p className="m-0 text-meta text-ink-muted">{tagline}</p>
    </footer>
  )
}
