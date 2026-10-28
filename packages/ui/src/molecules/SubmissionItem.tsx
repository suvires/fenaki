import type { ReactNode } from 'react'
import { Badge, type BadgeTone } from '../atoms/Badge.tsx'
import { cx } from '../foundations/cx.ts'

export interface SubmissionItemProps {
  /** The video's title, linking to it on YouTube or Vimeo. */
  title: string
  href: string
  /** Its state: «Falta el código», «En revisión»… */
  status: string
  statusTone?: BadgeTone
  /** A sentence about the state, or the reason it was not published. */
  text?: string
  /** The verification code, shown large so it can be read and copied. */
  code?: string
  /** Buttons under the code: «Copiar código», «Comprobar». */
  actions?: ReactNode
  className?: string
}

/** One short sent from «Sube tu corto», in the sender's list. */
export function SubmissionItem({
  title,
  href,
  status,
  statusTone = 'neutral',
  text,
  code,
  actions,
  className,
}: SubmissionItemProps) {
  return (
    <article className={cx('grid gap-3 p-4 rounded-sm bg-raised border border-subtle', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-card-title min-w-0">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4 hover:no-underline focus-visible:focus-ring"
          >
            {title}
          </a>
        </h3>
        <Badge tone={statusTone}>{status}</Badge>
      </div>
      {text ? <p className="m-0 text-small text-secondary">{text}</p> : null}
      {code ? (
        <p className="m-0 justify-self-start px-4 py-2 rounded-sm bg-canvas border border-strong font-mono text-title select-all">
          {code}
        </p>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </article>
  )
}
