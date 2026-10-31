import type { ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'

export interface SignupBandProps {
  /** Anchor for links to the band («Apúntate de nuevo»). */
  id?: string
  title: string
  /** What the reader gets, in one sentence. */
  text: string
  /** The form: an email field with its button. */
  children: ReactNode
  /** Under the form: how the email is used, with a link to the privacy policy. */
  note?: ReactNode
  className?: string
}

/**
 * A band that asks for an email: the weekly selection above the footer. A large surface (the
 * radius of the heroes and the offer cards), the pitch on the left and the form on the right on
 * wide screens, one under the other on a phone.
 */
export function SignupBand({ id, title, text, children, note, className }: SignupBandProps) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cx(
        'grid gap-6 p-6 md:p-8 rounded-lg bg-raised scroll-mt-8',
        'lg:grid-cols-2 lg:gap-12 lg:items-center',
        className,
      )}
    >
      <div className="grid gap-2">
        <h2 id={headingId} className="m-0 font-display text-title uppercase text-balance">
          {title}
        </h2>
        <p className="m-0 text-body-l text-secondary">{text}</p>
      </div>
      <div className="grid gap-3">
        {children}
        {note ? <p className="m-0 text-small text-secondary">{note}</p> : null}
      </div>
    </section>
  )
}
