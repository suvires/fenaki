import type { ReactNode } from 'react'
import type { Locale } from '@fenaki/i18n'
import { cx } from '../foundations/cx.ts'
import { stillTextClass, type StillTextColor } from '../foundations/stillText.ts'
import { Button } from '../atoms/Button.tsx'
import { Duration } from '../atoms/Duration.tsx'
import { Poster, type PosterProps } from '../atoms/Poster.tsx'

export interface ShortHeroProps {
  /** Why this short is here, such as «Último estreno». */
  eyebrow?: string
  title: string
  /** Running time, shown first in the details line. */
  seconds: number
  locale?: Locale
  /** The rest of the details line, already formatted: director, year, type. A link when it has `href`. */
  details?: (string | { label: string; href: string })[]
  /** Clamped to three lines, unless `clampSynopsis` is false (the short's own page shows it whole). */
  synopsis?: string
  clampSynopsis?: boolean
  ctaLabel: string
  ctaHref?: string
  /** The main action as a button instead of a link, such as playing the short on its own page. */
  onCta?: () => void
  /** Extra attributes for the main action, such as the analytics event (`data-umami-event`). */
  ctaAttributes?: Record<`data-${string}`, string>
  /** A second action next to the main one, such as the «Añadir a mi lista» button. */
  secondaryAction?: ReactNode
  poster: Omit<PosterProps, 'className'>
  /** A still of the short served from Fenaki. Decorative (empty alt); it fills the hero and replaces the poster. */
  backdrop?: string
  /** Color of the text over the backdrop: light on dark stills (the default), dark on light ones. */
  backdropTextColor?: StillTextColor
  /** The backdrop already carries the title: the heading stays for screen readers only. */
  backdropHasTitle?: boolean
  /** 1 when it opens the page; 2 under another page title. */
  headingLevel?: 1 | 2
  className?: string
}

/**
 * The featured short at the top of the home page, under the header, and the top of a short's own
 * page before it plays (see PlayerGate). One per page.
 * The poster is decorative (the title is already the heading) and only shows from `md` up.
 */
export function ShortHero({
  eyebrow,
  title,
  seconds,
  locale,
  details = [],
  synopsis,
  clampSynopsis = true,
  ctaLabel,
  ctaHref,
  onCta,
  ctaAttributes,
  secondaryAction,
  poster,
  backdrop,
  backdropTextColor,
  backdropHasTitle = false,
  headingLevel = 1,
  className,
}: ShortHeroProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  const text = backdrop ? stillTextClass(backdropTextColor) : 'text-primary'
  return (
    <section
      className={cx(
        'relative isolate overflow-hidden grid grid-cols-1 items-end gap-8',
        'p-6 md:p-10 rounded-lg bg-raised shadow-md',
        // With a still, the hero takes the still's own 16:9 shape from md up, so the image is shown
        // whole; on small screens it keeps a minimum height for the text instead.
        backdrop
          ? 'min-h-(--short-hero-min-height) md:min-h-0 md:aspect-still'
          : 'md:grid-cols-[minmax(0,1fr)_auto]',
        className,
      )}
    >
      {backdrop ? (
        <img
          src={backdrop}
          alt=""
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 -z-10 size-full object-cover"
        />
      ) : null}
      <div className={cx('grid gap-4 min-w-0', text)}>
        {eyebrow ? (
          <p className="m-0 font-mono text-label uppercase text-accent">{eyebrow}</p>
        ) : null}
        <Heading
          className={cx(
            'm-0 font-display text-display-l md:text-display-xl uppercase text-balance',
            backdrop && backdropHasTitle && 'sr-only',
          )}
        >
          {title}
        </Heading>
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
          <Duration seconds={seconds} locale={locale} inherit />
          {details.map((detail) =>
            typeof detail === 'string' ? (
              <span key={detail} className="before:content-['·'] before:mr-3">
                {detail}
              </span>
            ) : (
              <span key={detail.href} className="before:content-['·'] before:mr-3">
                <a
                  href={detail.href}
                  className="text-inherit underline underline-offset-2 hover:text-accent rounded-xs focus-visible:focus-ring"
                >
                  {detail.label}
                </a>
              </span>
            ),
          )}
        </p>
        {synopsis ? (
          <p className={cx('m-0 max-w-hero-text text-body-l', clampSynopsis && 'line-clamp-3')}>
            {synopsis}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="lg"
            icon="play"
            href={onCta ? undefined : ctaHref}
            onClick={onCta}
            {...ctaAttributes}
          >
            {ctaLabel}
          </Button>
          {secondaryAction}
        </div>
      </div>
      {backdrop ? null : (
        <div aria-hidden="true" className="hidden md:block w-hero-poster">
          <Poster {...poster} />
        </div>
      )}
    </section>
  )
}
