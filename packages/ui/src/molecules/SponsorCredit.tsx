import { cx } from '../foundations/cx.ts'

export interface SponsorCreditProps {
  /** «Presentada por». */
  label: string
  name: string
  /** The sponsor's website. The name becomes a sponsored link that opens in a new tab. */
  href?: string
  /** Extra attributes for the link, such as the analytics event (`data-umami-event`). */
  linkAttributes?: Record<`data-${string}`, string>
  className?: string
}

/** The sponsor's credit. Only on telon grounds, never on a short's page or near the player. */
export function SponsorCredit({
  label,
  name,
  href,
  linkAttributes,
  className,
}: SponsorCreditProps) {
  return (
    <p className={cx('flex flex-wrap items-baseline gap-2 m-0 text-meta', className)}>
      <span className="font-mono text-label-s uppercase opacity-secondary">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="sponsored noopener"
          className="text-meta-strong text-inherit underline underline-offset-4 hover:no-underline rounded-xs focus-visible:focus-ring"
          {...linkAttributes}
        >
          {name}
        </a>
      ) : (
        <span className="text-meta-strong">{name}</span>
      )}
    </p>
  )
}
