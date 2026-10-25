import { cx } from '../cx.ts'
import { Button } from './Button.tsx'
import { Poster, type PosterProps } from './Poster.tsx'
import { SponsorCredit, type SponsorCreditProps } from './SponsorCredit.tsx'

export interface CollectionHeroProps {
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  ctaHref?: string
  secondaryLabel?: string
  /** With a sponsor, the hero turns telon and shows the sponsor credit. */
  sponsor?: Omit<SponsorCreditProps, 'className'>
  /** Up to three. */
  posters?: Omit<PosterProps, 'className'>[]
  className?: string
}

/**
 * The featured collection at the top of the home page. One per page.
 * The three posters are decorative and only show from the `md` breakpoint up.
 */
export function CollectionHero({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  sponsor,
  posters = [],
  className,
}: CollectionHeroProps) {
  const sponsored = Boolean(sponsor)
  return (
    <section
      className={cx(
        'grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-8',
        'p-6 md:p-8 rounded-sm',
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
        <p
          className={cx(
            'm-0 max-w-hero-text text-body-l',
            sponsored ? 'text-on-telon' : 'text-ink-muted',
          )}
        >
          {description}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="lg" icon="play" href={ctaHref}>
            {ctaLabel}
          </Button>
          {secondaryLabel ? (
            <Button
              variant="secondary"
              size="lg"
              icon="plus"
              surface={sponsored ? 'telon' : 'sala'}
            >
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
        {sponsor ? <SponsorCredit label={sponsor.label} name={sponsor.name} /> : null}
      </div>
      <div aria-hidden="true" className="hidden md:grid grid-cols-3 items-end gap-3">
        {posters.slice(0, 3).map((poster, index) => (
          <Poster key={index} {...poster} className={index === 1 ? '-translate-y-6' : undefined} />
        ))}
      </div>
    </section>
  )
}
