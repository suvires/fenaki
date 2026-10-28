import type { Locale } from '@fenaki/i18n'
import { cx } from '../foundations/cx.ts'
import { stillTextClass, type StillTextColor } from '../foundations/stillText.ts'
import { Badge, type BadgeTone } from '../atoms/Badge.tsx'
import { Duration } from '../atoms/Duration.tsx'
import { Poster, type PosterTone } from '../atoms/Poster.tsx'

export interface ShortCardProps {
  title: string
  director?: string
  year?: number
  seconds?: number
  locale?: Locale
  tone?: PosterTone
  /** A still of the short served from Fenaki. Without it the card shows the typographic poster. */
  image?: string
  /** Color of the text over the still: light on dark stills (the default), dark on light ones. */
  imageTextColor?: StillTextColor
  /** The still already carries the title: it is not painted over the image. */
  imageHasTitle?: boolean
  /** The short's page. The whole card is one link. */
  href?: string
  /** Not shown on the card: kept in the markup for the floating preview. */
  synopsis?: string
  /** At most three. */
  badges?: { label: string; tone?: BadgeTone }[]
  /** The short's identifier. With it the card can open the floating preview and be saved to «Mi lista». */
  slug?: string
  /** The short's type as the viewer reads it («Ficción»), for the preview. */
  typeLabel?: string
  /** How much the viewer has seen, from 0 to 1: a thin bar at the foot of the image. */
  progress?: number
  /** Says it in words, for the card's accessible name: «Visto al 45 %». */
  progressLabel?: string
  /** A card of the viewer's history, on its page or in «Seguir viendo»: its preview offers to remove it. */
  removableFrom?: 'history' | 'continueWatching'
  /** Fill the grid cell instead of the fixed rail width. */
  stretch?: boolean
  className?: string
}

/**
 * A short in a rail or grid. At rest only the still and the title show (unless the still carries it already) (and «Contenido de marca»,
 * which must always be identifiable). The details are in the DOM but not on screen: its name reads
 * title, running time, year, director and badges once, and the page's preview island reads the
 * `data-*` attributes and the hidden synopsis to float the preview of a card on hover (devices
 * with a fine pointer only). The whole card is one link; touch devices just follow it.
 */
export function ShortCard({
  title,
  director,
  year,
  seconds,
  locale,
  tone,
  image,
  imageTextColor,
  imageHasTitle = false,
  href,
  synopsis,
  badges,
  slug,
  typeLabel,
  progress,
  progressLabel,
  removableFrom,
  stretch = false,
  className,
}: ShortCardProps) {
  const Tag = href ? 'a' : 'div'
  const branded = badges?.filter((badge) => badge.tone === 'branded') ?? []
  const others = badges?.filter((badge) => badge.tone !== 'branded') ?? []
  const previewable = Boolean(slug && href)
  const seen = Math.min(1, Math.max(0, progress ?? 0))
  return (
    <Tag
      href={href}
      data-short-card={previewable ? slug : undefined}
      data-title={previewable ? title : undefined}
      data-director={previewable ? director : undefined}
      data-year={previewable ? year : undefined}
      data-seconds={previewable ? seconds : undefined}
      data-tone={previewable ? tone : undefined}
      data-image-text={previewable && image ? imageTextColor : undefined}
      data-image-title={previewable && image && imageHasTitle ? '' : undefined}
      data-type={previewable ? typeLabel : undefined}
      data-removable-from={previewable ? removableFrom : undefined}
      className={cx(
        'group relative block rounded-sm text-inherit no-underline outline-hidden',
        stretch ? 'w-full' : 'w-(--short-card-width)',
        className,
      )}
    >
      <div className="relative rounded-sm">
        <div className="relative overflow-hidden rounded-sm aspect-still bg-muted">
          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div aria-hidden="true" className="size-full">
              <Poster
                shape="landscape"
                title={title}
                director={director}
                year={year}
                tone={tone}
                className="size-full"
              />
            </div>
          )}
          {image && !imageHasTitle ? (
            <span
              className={cx('absolute inset-x-0 bottom-0 grid p-3', stillTextClass(imageTextColor))}
            >
              <span className="text-card-title truncate">{title}</span>
            </span>
          ) : null}
          {seen > 0 ? (
            // SVG attributes, not a style attribute: the site's CSP does not allow those.
            <svg
              aria-hidden="true"
              preserveAspectRatio="none"
              className="absolute inset-x-0 bottom-0 w-full h-(--short-card-progress-height)"
            >
              <rect width="100%" height="100%" className="fill-(--background-color-canvas)/70" />
              <rect width={`${seen * 100}%`} height="100%" className="fill-accent" />
            </svg>
          ) : null}
          {branded.length > 0 ? (
            <span className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
              {branded.map((badge) => (
                <Badge
                  key={badge.label}
                  tone={badge.tone}
                  data-card-badge=""
                  data-tone={badge.tone}
                >
                  {badge.label}
                </Badge>
              ))}
            </span>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-sm pointer-events-none group-focus-visible:focus-ring"
        />
      </div>
      <span className="sr-only">
        {/* The poster is hidden from screen readers and carries the title, so the name starts with it. A still that carries it has no title text on screen either. */}
        {image && !imageHasTitle ? null : `${title}, `}
        {seconds ? <Duration seconds={seconds} locale={locale} /> : null}
        {year ? `, ${year}` : null}
        {director ? `, ${director}` : null}
        {seen > 0 && progressLabel ? `, ${progressLabel}` : null}
        {others.slice(0, 3).map((badge) => (
          <span key={badge.label}>
            {', '}
            <Badge tone={badge.tone} data-card-badge="" data-tone={badge.tone}>
              {badge.label}
            </Badge>
          </span>
        ))}
      </span>
      {previewable && synopsis ? (
        <span hidden data-card-synopsis="">
          {synopsis}
        </span>
      ) : null}
    </Tag>
  )
}
