import type { Locale } from '@fenaki/i18n'
import { cx } from '../cx.ts'
import { Badge, type BadgeTone } from './Badge.tsx'
import { Duration } from './Duration.tsx'
import { Poster, type PosterTone } from './Poster.tsx'

export interface ShortCardProps {
  title: string
  director?: string
  year?: number
  seconds?: number
  locale?: Locale
  tone?: PosterTone
  /** A still of the short served from Fenaki. Without it the card shows the typographic poster. */
  image?: string
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
  /** Fill the grid cell instead of the fixed rail width. */
  stretch?: boolean
  className?: string
}

/**
 * A short in a rail or grid. At rest only the still and the title show (and «Contenido de marca»,
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
  href,
  synopsis,
  badges,
  slug,
  typeLabel,
  stretch = false,
  className,
}: ShortCardProps) {
  const Tag = href ? 'a' : 'div'
  const branded = badges?.filter((badge) => badge.tone === 'branded') ?? []
  const others = badges?.filter((badge) => badge.tone !== 'branded') ?? []
  const previewable = Boolean(slug && href)
  return (
    <Tag
      href={href}
      data-short-card={previewable ? slug : undefined}
      data-title={previewable ? title : undefined}
      data-director={previewable ? director : undefined}
      data-year={previewable ? year : undefined}
      data-seconds={previewable ? seconds : undefined}
      data-tone={previewable ? tone : undefined}
      data-type={previewable ? typeLabel : undefined}
      className={cx(
        'group relative block rounded-sm text-inherit no-underline outline-hidden',
        stretch ? 'w-full' : 'w-(--size-card)',
        className,
      )}
    >
      <div className="relative rounded-sm">
        <div className="relative overflow-hidden rounded-sm aspect-still bg-sala-2">
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
          {image ? (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-sala-0 via-sala-0/(--opacity-scrim) to-transparent"
              />
              <span className="absolute inset-x-0 bottom-0 grid p-3 text-ink">
                <span className="text-card-title truncate">{title}</span>
              </span>
            </>
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
        {/* The poster is hidden from screen readers and carries the title, so the name starts with it. */}
        {image ? null : `${title}, `}
        {seconds ? <Duration seconds={seconds} locale={locale} /> : null}
        {year ? `, ${year}` : null}
        {director ? `, ${director}` : null}
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
