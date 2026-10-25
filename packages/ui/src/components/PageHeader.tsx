import type { ReactNode } from 'react'
import { cx } from '../cx.ts'

export interface PageHeaderProps {
  /** A short label above the title, in the timecode voice: «Dirección · Guion». */
  eyebrow?: string
  title: string
  description?: string
  /** Actions or facts under the description. */
  children?: ReactNode
  className?: string
}

/** The top of a catalog page: browse, a person, the sponsorship page. One per page. */
export function PageHeader({ eyebrow, title, description, children, className }: PageHeaderProps) {
  return (
    <header className={cx('grid gap-4', className)}>
      {eyebrow ? (
        <p className="m-0 font-mono text-label uppercase text-tungsteno-text">{eyebrow}</p>
      ) : null}
      <h1 className="m-0 font-display text-display-l md:text-display-xl uppercase text-balance">
        {title}
      </h1>
      {description ? (
        <p className="m-0 max-w-hero-text text-body-l text-ink-muted">{description}</p>
      ) : null}
      {children}
    </header>
  )
}
