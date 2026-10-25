import { cx } from '../cx.ts'
import { Icon } from './Icon.tsx'
import { SponsorCredit, type SponsorCreditProps } from './SponsorCredit.tsx'

export interface ShowcaseHeroProps {
  /** «Escaparate · Escuela de cine». */
  eyebrow: string
  /** The organization's name. */
  title: string
  description?: string
  /** The organization's logo, shown on a light plate: most logos are drawn for white. */
  logo?: { src: string; alt: string; width?: number; height?: number }
  /** The organization's website. */
  website?: { href: string; label: string }
  /** «Presentado por»: with it, the header turns telon, as a sponsored collection does. */
  sponsor?: Omit<SponsorCreditProps, 'className'>
  className?: string
}

/**
 * The header of an organization's showcase: its identity, a link to its site and the optional
 * «presented by» credit. Sponsorship lives here, never on a short's page or near the player.
 */
export function ShowcaseHero({
  eyebrow,
  title,
  description,
  logo,
  website,
  sponsor,
  className,
}: ShowcaseHeroProps) {
  const sponsored = Boolean(sponsor)
  return (
    <header
      className={cx(
        'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] items-center gap-6 p-6 md:p-8 rounded-hero',
        sponsored ? 'bg-telon text-on-telon' : 'bg-sala-1',
        className,
      )}
    >
      <div className="grid gap-4 min-w-0">
        <p
          className={cx(
            'm-0 font-mono text-label uppercase',
            sponsored ? 'text-on-telon' : 'text-tungsteno-text',
          )}
        >
          {eyebrow}
        </p>
        <h1 className="m-0 font-display text-display-l md:text-display-xl uppercase text-balance">
          {title}
        </h1>
        {description ? (
          <p
            className={cx(
              'm-0 max-w-hero-text text-body-l',
              sponsored ? 'text-on-telon' : 'text-ink-muted',
            )}
          >
            {description}
          </p>
        ) : null}
        {website ? (
          <p className="m-0">
            <a
              href={website.href}
              rel="noopener"
              className="inline-flex items-center gap-1 rounded-xs text-small-strong text-inherit underline underline-offset-4 focus-visible:focus-ring"
            >
              {website.label}
              <Icon name="arrow" size="xs" />
            </a>
          </p>
        ) : null}
        {sponsor ? <SponsorCredit {...sponsor} /> : null}
      </div>
      {logo ? (
        <div className="justify-self-start md:justify-self-end p-4 rounded-sm bg-ink">
          <img
            src={logo.src}
            alt={logo.alt}
            width={logo.width}
            height={logo.height}
            className="block h-auto max-h-(--size-card) w-auto max-w-(--size-card)"
          />
        </div>
      ) : null}
    </header>
  )
}
