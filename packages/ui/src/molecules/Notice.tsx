import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'

export type NoticeTone = 'info' | 'danger'

export interface NoticeProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** `info` (plata) for states and legal facts, such as «Borrador»; `danger` for failures. */
  tone?: NoticeTone
  /** A one- or two-word label in the timecode voice. */
  label?: string
  title?: string
  children?: ReactNode
  className?: string
}

const LABEL_TONES = { info: 'text-plata', danger: 'text-danger' } as const

/**
 * A short message about the page or an action: a draft legal text, a form that was sent or
 * failed. Pass `role="status"` or `role="alert"` when it appears after an action.
 */
export function Notice({ tone = 'info', label, title, children, className, ...rest }: NoticeProps) {
  return (
    <aside
      data-tone={tone}
      className={cx(
        'grid gap-2 px-4 py-3 rounded-sm border bg-sala-1',
        tone === 'danger' ? 'border-danger' : 'border-line-strong',
        className,
      )}
      {...rest}
    >
      {label ? (
        <span className={cx('font-mono text-label uppercase', LABEL_TONES[tone])}>{label}</span>
      ) : null}
      {title ? <p className="m-0 text-card-title text-ink">{title}</p> : null}
      {children ? <div className="grid gap-2 text-small text-ink-muted">{children}</div> : null}
    </aside>
  )
}
