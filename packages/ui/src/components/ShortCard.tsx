import type { Locale } from '@shortix/i18n'
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
  /** The short's page. The whole card is one link. */
  href?: string
  /** At most three. */
  badges?: { label: string; tone?: BadgeTone }[]
  /** Fill the grid cell instead of the fixed rail width. */
  stretch?: boolean
  className?: string
}

/** A short in a rail or grid: poster, title, duration and director, up to three badges. */
export function ShortCard({
  title,
  director,
  year,
  seconds,
  locale,
  tone,
  href,
  badges,
  stretch = false,
  className,
}: ShortCardProps) {
  const Tag = href ? 'a' : 'div'
  return (
    <Tag
      href={href}
      className={cx(
        'group grid content-start gap-2 rounded-sm text-inherit no-underline focus-visible:focus-ring',
        stretch ? 'w-full' : 'w-(--size-card)',
        className,
      )}
    >
      <Poster
        title={title}
        director={director}
        year={year}
        tone={tone}
        className={cx(
          'shadow-card transition-[transform,box-shadow] duration-(--duration-lift) ease-standard',
          'group-hover:-translate-y-(--size-lift) group-hover:shadow-hover',
          'group-focus-visible:-translate-y-(--size-lift) group-focus-visible:shadow-hover',
          'motion-reduce:transition-none motion-reduce:translate-none!',
        )}
      />
      <span className="grid gap-hair min-w-0">
        <span className="text-card-title truncate">{title}</span>
        <span className="flex items-baseline gap-2 min-w-0 text-meta text-ink-muted">
          {seconds ? <Duration seconds={seconds} locale={locale} /> : null}
          {director ? <span className="truncate">{director}</span> : null}
        </span>
        {badges && badges.length > 0 ? (
          <span className="flex flex-wrap gap-1 mt-1">
            {badges.slice(0, 3).map((badge) => (
              <Badge key={badge.label} tone={badge.tone}>
                {badge.label}
              </Badge>
            ))}
          </span>
        ) : null}
      </span>
    </Tag>
  )
}
