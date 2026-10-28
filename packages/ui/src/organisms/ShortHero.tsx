import type { ReactNode } from 'react'
import type { Locale } from '@fenaki/i18n'
import { cx } from '../foundations/cx.ts'
import { stillTextClass, type StillTextColor } from '../foundations/stillText.ts'
import { Badge, type BadgeTone } from '../atoms/Badge.tsx'
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
  /**
   * «Dirigido por …» on a line of its own under the details, as in the preview: text, and the
   * directors as links to their pages.
   */
  directedBy?: (string | { label: string; href: string })[]
  /** The short's badges («Contenido de marca», «Sin diálogos»…), after the details, as in the preview. */
  badges?: { label: string; tone?: BadgeTone }[]
  /** Clamped to three lines, unless `clampSynopsis` is false (the short's own page shows it whole). */
  synopsis?: string
  clampSynopsis?: boolean
  /** The main action. Without it there is none (the short's page while it plays). */
  ctaLabel?: string
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
  /**
   * `overlay` (the home page): the text over the still. `stacked` (a short's page): the still on
   * its own, whole, and every detail under it, the title too.
   */
  layout?: 'overlay' | 'stacked'
  /**
   * In a stacked hero, what takes the still's place: the player, once it plays. Until then the
   * actions sit on the still; then they move under it, with the details.
   */
  media?: ReactNode
  className?: string
}

/**
 * The featured short at the top of the home page, under the header, and the top of a short's own
 * page, where the player takes the still's place (see PlayerGate). One per page.
 * The poster is decorative (the title is already the heading) and only shows from `md` up.
 */
export function ShortHero({
  eyebrow,
  title,
  seconds,
  locale,
  details = [],
  badges = [],
  directedBy,
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
  layout = 'overlay',
  media,
  className,
}: ShortHeroProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  const stacked = layout === 'stacked'
  // A short's page with a still, before it plays: the actions sit on the still. With the
  // typographic poster, which carries the title at its foot, they stay under it.
  const onStill = stacked && !media && Boolean(backdrop)
  const text = backdrop && !stacked ? stillTextClass(backdropTextColor) : 'text-primary'
  const actions = (
    <div className="flex flex-wrap gap-3">
      {ctaLabel ? (
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
      ) : null}
      {secondaryAction}
    </div>
  )
  const info = (
    <div className={cx('grid gap-4 min-w-0', text)}>
      {eyebrow ? <p className="m-0 font-mono text-label uppercase text-accent">{eyebrow}</p> : null}
      <Heading
        className={cx(
          'm-0 font-display text-display-l md:text-display-xl uppercase text-balance',
          backdrop && backdropHasTitle && !stacked && 'sr-only',
        )}
      >
        {title}
      </Heading>
      <p
        className={cx(
          'm-0 flex flex-wrap items-center gap-x-3 gap-y-1',
          // On a short's page, the size of the page's other facts («Idioma», «Ficha técnica»).
          stacked ? 'text-body' : 'text-meta',
        )}
      >
        <Duration seconds={seconds} locale={locale} inherit inheritSize={stacked} />
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
        {badges.map((badge) => (
          <Badge key={badge.label} tone={badge.tone} size={stacked ? 'lg' : 'md'}>
            {badge.label}
          </Badge>
        ))}
      </p>
      {directedBy && directedBy.length > 0 ? (
        <p className={cx('m-0 text-secondary', stacked ? 'text-body' : 'text-meta')}>
          {directedBy.map((piece, index) =>
            typeof piece === 'string' ? (
              piece
            ) : (
              <a
                key={index}
                href={piece.href}
                className="text-primary underline underline-offset-2 hover:text-accent rounded-xs focus-visible:focus-ring"
              >
                {piece.label}
              </a>
            ),
          )}
        </p>
      ) : null}
      {synopsis ? (
        <p className={cx('m-0 max-w-hero-text text-body-l', clampSynopsis && 'line-clamp-3')}>
          {synopsis}
        </p>
      ) : null}
      {onStill ? null : actions}
    </div>
  )

  if (stacked)
    return (
      <section className={cx('grid gap-6', className)}>
        <div className="relative aspect-still max-w-full overflow-hidden rounded-lg bg-raised shadow-md">
          {media ??
            (backdrop ? (
              <img
                src={backdrop}
                alt=""
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div aria-hidden="true" className="absolute inset-0">
                <Poster {...poster} shape="landscape" className="size-full rounded-none" />
              </div>
            ))}
          {/* Before it plays, the actions sit on the still, over a shade that keeps them legible;
              `data-on-still` lets buttons that have a compact form use it (MyListButton,
              ShareButton). */}
          {onStill ? (
            <div
              data-on-still=""
              className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-linear-to-t from-canvas from-0% to-transparent"
            >
              {actions}
            </div>
          ) : null}
        </div>
        {info}
      </section>
    )

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
      {info}
      {backdrop ? null : (
        <div aria-hidden="true" className="hidden md:block w-hero-poster">
          <Poster {...poster} />
        </div>
      )}
    </section>
  )
}
