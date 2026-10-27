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
  /** The rest of the details line, already formatted: director, year, type. */
  details?: string[]
  /** Clamped to three lines. */
  synopsis?: string
  ctaLabel: string
  ctaHref?: string
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
  secondaryAction,
  poster,
  backdrop,
  backdropTextColor,
  backdropHasTitle = false,
  headingLevel = 1,
  className,
}: ShortHeroProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  const text = backdrop ? stillTextClass(backdropTextColor) : 'text-ink'
  return (
    <section
      className={cx(
        'relative isolate overflow-hidden grid grid-cols-1 items-end gap-8',
        'p-6 md:p-10 rounded-hero bg-sala-1 shadow-hero',
        // With a still, the hero takes the still's own 16:9 shape from md up, so the image is shown
        // whole; on small screens it keeps a minimum height for the text instead.
        backdrop
          ? 'min-h-(--size-hero) md:min-h-0 md:aspect-still'
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
          <p className="m-0 font-mono text-label uppercase text-tungsteno-text">{eyebrow}</p>
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
          {details.map((detail) => (
            <span key={detail} className="before:content-['·'] before:mr-3">
              {detail}
            </span>
          ))}
        </p>
        {synopsis ? (
          <p className="m-0 max-w-hero-text text-body-l line-clamp-3">{synopsis}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="lg" icon="play" href={ctaHref}>
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
