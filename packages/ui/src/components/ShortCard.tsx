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
  /** Shown clamped to two lines when the card expands. */
  synopsis?: string
  /** At most three. */
  badges?: { label: string; tone?: BadgeTone }[]
  /** Fill the grid cell instead of the fixed rail width. */
  stretch?: boolean
  /** Show the expanded state without hovering: for previews and visual tests only. */
  expanded?: boolean
  className?: string
}

/**
 * A short in a rail or grid. At rest only the still and the title show (and «Contenido de marca»,
 * which must always be identifiable). On hover or keyboard focus the card grows above its
 * neighbours and reveals duration, year, director, synopsis and the other badges. Touch devices
 * keep the resting card. The whole card is one link; the details are in the DOM, so its name
 * reads title, running time, year, director and badges once; the synopsis is left to the short's page.
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
  stretch = false,
  expanded = false,
  className,
}: ShortCardProps) {
  const Tag = href ? 'a' : 'div'
  const branded = badges?.filter((badge) => badge.tone === 'branded') ?? []
  const others = badges?.filter((badge) => badge.tone !== 'branded') ?? []
  const hasMeta = Boolean(seconds || year || director)
  return (
    <Tag
      href={href}
      data-expanded={expanded ? '' : undefined}
      className={cx(
        'group relative block rounded-sm text-inherit no-underline outline-hidden',
        'hover:z-(--layer-card) focus-visible:z-(--layer-card) data-expanded:z-(--layer-card)',
        stretch ? 'w-full' : 'w-(--size-card)',
        className,
      )}
    >
      <div
        className={cx(
          'relative rounded-sm shadow-card',
          'transition-[scale,translate,box-shadow] duration-(--duration-lift) ease-standard',
          'expanded:scale-(--scale-card) expanded:-translate-y-(--size-lift) expanded:shadow-hover',
          'motion-reduce:transition-none motion-reduce:scale-none! motion-reduce:translate-none!',
        )}
      >
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
            <div
              aria-hidden="true"
              className={cx(
                'size-full transition-opacity duration-(--duration-lift) ease-standard',
                'expanded:opacity-(--opacity-poster-dim) motion-reduce:transition-none',
              )}
            >
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
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-sala-0 via-sala-0/(--opacity-scrim) to-transparent',
              'transition-[height] duration-(--duration-lift) ease-standard',
              'expanded:h-full motion-reduce:transition-none',
              image ? '' : 'opacity-0 expanded:opacity-100',
            )}
          />
          <span className="absolute inset-x-0 bottom-0 grid p-3 text-ink">
            <span
              className={cx(
                'text-card-title truncate',
                // The poster already carries the title at rest: this one only joins the details.
                image ? '' : 'opacity-0 expanded:opacity-100',
              )}
            >
              {title}
            </span>
            <span
              className={cx(
                'grid grid-rows-[0fr] opacity-0',
                'transition-[grid-template-rows,opacity] duration-(--duration-lift) ease-standard',
                'expanded:grid-rows-[1fr] expanded:opacity-100 motion-reduce:transition-none',
              )}
            >
              <span className="grid gap-1 min-h-0 min-w-0 overflow-hidden pt-1">
                {hasMeta ? (
                  <span className="flex flex-wrap items-baseline gap-x-2 text-meta text-ink">
                    {seconds ? <Duration seconds={seconds} locale={locale} muted={false} /> : null}
                    {year ? <span className="before:content-['·'] before:mr-2">{year}</span> : null}
                    {director ? (
                      <span className="min-w-0 truncate before:content-['·'] before:mr-2">
                        {director}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {synopsis ? (
                  <span aria-hidden="true" className="text-meta text-ink-muted line-clamp-2">
                    {synopsis}
                  </span>
                ) : null}
                {others.length > 0 ? (
                  <span className="flex flex-wrap gap-1 pt-1">
                    {others.slice(0, 3).map((badge) => (
                      <Badge key={badge.label} tone={badge.tone}>
                        {badge.label}
                      </Badge>
                    ))}
                  </span>
                ) : null}
              </span>
            </span>
          </span>
          {branded.length > 0 ? (
            <span className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
              {branded.map((badge) => (
                <Badge key={badge.label} tone={badge.tone}>
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
    </Tag>
  )
}
