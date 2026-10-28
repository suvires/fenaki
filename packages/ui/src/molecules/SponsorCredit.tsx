import { cx } from '../foundations/cx.ts'

export interface SponsorCreditProps {
  /** «Presentada por». */
  label: string
  name: string
  /** The sponsor's website. The name becomes a sponsored link that opens in a new tab. */
  href?: string
  /** The sponsor's logo, in place of the name (which stays its text alternative), on a light plate. */
  logo?: { src: string }
  /** Extra attributes for the link, such as the analytics event (`data-umami-event`). */
  linkAttributes?: Record<`data-${string}`, string>
  className?: string
}

/** The sponsor's credit. Only on the sponsored colour, never on a short's page or near the player. */
export function SponsorCredit({
  label,
  name,
  href,
  logo,
  linkAttributes,
  className,
}: SponsorCreditProps) {
  const mark = logo ? (
    <span className="inline-flex p-2 rounded-xs bg-inverse">
      <img
        src={logo.src}
        alt={name}
        className="block h-(--sponsor-credit-logo-height) w-auto max-w-(--size-column)"
      />
    </span>
  ) : (
    name
  )
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
          {mark}
        </a>
      ) : (
        <span className="text-meta-strong">{mark}</span>
      )}
    </p>
  )
}
