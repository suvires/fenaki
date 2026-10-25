import type { Locale } from '@fenaki/i18n'
import { cx } from '../cx.ts'
import { Button } from './Button.tsx'
import { Duration } from './Duration.tsx'
import { Poster, type PosterProps } from './Poster.tsx'

export interface ShortHeroProps {
  /** Why this short is here, such as «Último estreno». */
  eyebrow: string
  title: string
  /** Running time, shown first in the details line. */
  seconds: number
  locale?: Locale
  /** The rest of the details line, already formatted: director, year, type. */
  details?: string[]
  /** Clamped to three lines. */
  synopsis?: string
  ctaLabel: string
  ctaHref?: string
  secondaryLabel?: string
  poster: Omit<PosterProps, 'className'>
  /** 1 when it opens the page; 2 under another page title. */
  headingLevel?: 1 | 2
  className?: string
}

/**
 * The featured short at the top of the home page, under the header. One per page.
 * The poster is decorative (the title is already the heading) and only shows from `md` up.
 */
export function ShortHero({
  eyebrow,
  title,
  seconds,
  locale,
  details = [],
  synopsis,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  poster,
  headingLevel = 1,
  className,
}: ShortHeroProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <section
      className={cx(
        'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] items-center gap-8',
        'p-6 md:p-10 rounded-hero bg-sala-1',
        className,
      )}
    >
      <div className="grid gap-4 min-w-0">
        <p className="m-0 font-mono text-label uppercase text-tungsteno-text">{eyebrow}</p>
        <Heading className="m-0 font-display text-display-l md:text-display-xl uppercase text-balance">
          {title}
        </Heading>
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-muted">
          <Duration seconds={seconds} locale={locale} />
          {details.map((detail) => (
            <span key={detail} className="before:content-['·'] before:mr-3">
              {detail}
            </span>
          ))}
        </p>
        {synopsis ? (
          <p className="m-0 max-w-hero-text text-body-l text-ink-muted line-clamp-3">{synopsis}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="lg" icon="play" href={ctaHref}>
            {ctaLabel}
          </Button>
          {secondaryLabel ? (
            <Button variant="secondary" size="lg" icon="plus">
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      </div>
      <div aria-hidden="true" className="hidden md:block w-hero-poster">
        <Poster {...poster} />
      </div>
    </section>
  )
}
