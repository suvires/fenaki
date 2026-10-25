import type { ReactNode } from 'react'
import { cx } from '../cx.ts'

export type LicenseRoute = 'embed' | 'open' | 'direct'

export interface LicenseNoteProps {
  route: LicenseRoute
  routeLabel: string
  /** For open licenses, the attribution the license requires, word for word. */
  children: ReactNode
  className?: string
}

/** How a short reaches Shortix and what its license asks for. On every short's page. */
export function LicenseNote({ route, routeLabel, children, className }: LicenseNoteProps) {
  return (
    <aside
      data-route={route}
      className={cx(
        'grid gap-1 px-4 py-3 max-w-note rounded-sm border border-line-strong bg-sala-1',
        className,
      )}
    >
      <span className="font-mono text-label uppercase text-plata">{routeLabel}</span>
      <p className="m-0 text-small text-ink-muted">{children}</p>
    </aside>
  )
}
