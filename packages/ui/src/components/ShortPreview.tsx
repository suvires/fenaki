import { defaultLocale, type Locale } from '@fenaki/i18n'
import type { CSSProperties, PointerEventHandler, Ref } from 'react'
import { cx } from '../cx.ts'
import { stillTextClass, type StillTextColor } from '../stillText.ts'
import { Badge, type BadgeTone } from './Badge.tsx'
import { Duration } from './Duration.tsx'
import { IconButton } from './IconButton.tsx'
import { Poster, type PosterTone } from './Poster.tsx'
import { RatingButtons, type Rating, type RatingButtonsProps } from './RatingButtons.tsx'

export interface ShortPreviewProps {
  title: string
  director?: string
  /** «Dirigido por …», already written for the viewer's language. */
  directedBy?: string
  year?: number
  seconds?: number
  locale?: Locale
  tone?: PosterTone
  /** A still of the short. Without it the preview shows the landscape typographic poster. */
  image?: string
  /** Color of the title over the still: light on dark stills (the default), dark on light ones. */
  imageTextColor?: StillTextColor
  /** The still already carries the title: it is not painted over the image. */
  imageHasTitle?: boolean
  /** «Ficción», «Animación»… */
  typeLabel?: string
  synopsis?: string
  badges?: { label: string; tone?: BadgeTone }[]
  /** The short's page: the play and «Más información» buttons go there. */
  href: string
  /** Whether the short is in «Mi lista». */
  saved?: boolean
  onToggleSaved?: () => void
  rating?: Rating
  onRate?: RatingButtonsProps['onChange']
  labels: {
    /** «Ver ahora» */
    play: string
    /** «Añadir a mi lista» */
    addToList: string
    /** «En mi lista» */
    inMyList: string
    /** «Más información» */
    more: string
    rating: RatingButtonsProps['labels']
  }
  /** `fixed` over the page (the default). Stories turn it off to lay the panel out in flow. */
  floating?: boolean
  /** The panel starts at the card's box (set through `--preview-from`) and grows to its own. */
  entering?: boolean
  /** Forwarded to the rating pill: for previews and visual tests only. */
  ratingExpanded?: boolean
  ratingTooltip?: Rating
  style?: CSSProperties
  className?: string
  ref?: Ref<HTMLDivElement>
  onPointerEnter?: PointerEventHandler<HTMLDivElement>
  onPointerLeave?: PointerEventHandler<HTMLDivElement>
}

/**
 * The floating preview of a short that opens when the pointer rests on its card: the still with the
 * title, then the actions (play, «Mi lista», rating, more information), the facts, the director and
 * the synopsis. Presentational: the page's preview island positions it and keeps the state.
 */
export function ShortPreview({
  title,
  director,
  directedBy,
  year,
  seconds,
  locale = defaultLocale,
  tone,
  image,
  imageTextColor,
  imageHasTitle = false,
  typeLabel,
  synopsis,
  badges,
  href,
  saved = false,
  onToggleSaved,
  rating,
  onRate,
  labels,
  floating = true,
  entering = false,
  ratingExpanded,
  ratingTooltip,
  style,
  className,
  ref,
  onPointerEnter,
  onPointerLeave,
}: ShortPreviewProps) {
  return (
    <div
      ref={ref}
      role="group"
      aria-label={title}
      data-short-preview=""
      data-entering={entering ? '' : undefined}
      style={style}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={cx(
        'rounded-panel bg-sala-1 shadow-hover',
        floating ? 'fixed z-(--layer-preview)' : 'relative',
        // It grows out of the card: no fade, so the growth itself is what you see.
        'transition-transform duration-(--duration-preview) ease-standard motion-reduce:transition-none',
        'data-entering:[transform:var(--preview-from)]',
        className,
      )}
    >
      <div className="relative aspect-still">
        {image ? (
          <>
            {/* The image is rounded itself instead of clipped by its container (steadier in the visual baselines). */}
            <img src={image} alt="" className="size-full object-cover rounded-t-panel" />
            {imageHasTitle ? null : (
              <span
                className={cx(
                  'absolute inset-x-0 bottom-0 grid p-4',
                  stillTextClass(imageTextColor),
                )}
              >
                <span className="text-card-title truncate">{title}</span>
              </span>
            )}
          </>
        ) : (
          <Poster
            shape="landscape"
            title={title}
            director={director}
            year={year}
            tone={tone}
            className="size-full rounded-t-panel rounded-b-none"
          />
        )}
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex items-center gap-2">
          <IconButton icon="play" label={labels.play} variant="primary" href={href} />
          <IconButton
            icon={saved ? 'check' : 'plus'}
            label={saved ? labels.inMyList : labels.addToList}
            aria-pressed={saved}
            onClick={onToggleSaved}
          />
          <RatingButtons
            value={rating}
            onChange={onRate}
            labels={labels.rating}
            expanded={ratingExpanded}
            tooltip={ratingTooltip}
          />
          <IconButton icon="chevron-down" label={labels.more} href={href} className="ml-auto" />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink">
          {seconds ? <Duration seconds={seconds} locale={locale} muted={false} /> : null}
          {year ? <span className="before:content-['·'] before:mr-2">{year}</span> : null}
          {typeLabel ? <span className="before:content-['·'] before:mr-2">{typeLabel}</span> : null}
          {badges?.map((badge) => (
            <Badge key={badge.label} tone={badge.tone}>
              {badge.label}
            </Badge>
          ))}
        </div>
        {directedBy ? <p className="m-0 text-meta text-ink-muted">{directedBy}</p> : null}
        {synopsis ? <p className="m-0 text-meta text-ink-muted line-clamp-3">{synopsis}</p> : null}
      </div>
    </div>
  )
}
