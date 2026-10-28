import { defaultLocale, type Locale } from '@fenaki/i18n'
import { useState, type CSSProperties, type PointerEventHandler, type Ref } from 'react'
import { cx } from '../foundations/cx.ts'
import { stillTextClass, type StillTextColor } from '../foundations/stillText.ts'
import { Badge, type BadgeTone } from '../atoms/Badge.tsx'
import { Duration } from '../atoms/Duration.tsx'
import { IconButton, type IconButtonProps } from '../atoms/IconButton.tsx'
import { Poster, type PosterTone } from '../atoms/Poster.tsx'
import { Tooltip } from '../atoms/Tooltip.tsx'
import { RatingButtons, type Rating, type RatingButtonsProps } from '../molecules/RatingButtons.tsx'

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
  /** The short's page: the play button and the rest of the panel lead there. */
  href: string
  /** Whether the short is in «Mi lista». */
  saved?: boolean
  onToggleSaved?: () => void
  rating?: Rating
  onRate?: RatingButtonsProps['onChange']
  /** A short of the viewer's history: the aspa that removes it from there. */
  onRemoveFromHistory?: () => void
  labels: {
    /** «Ver ahora» */
    play: string
    /** «Añadir a mi lista» */
    addToList: string
    /** «Quitar de mi lista» */
    removeFromList: string
    /** «Quitar del historial» or «Quitar de Seguir viendo», when the panel offers it. */
    removeFromHistory?: string
    /** «Más información»: the name of the link that covers the panel. */
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
 * title, then the actions (play, «Mi lista», removing it from the history when it is there, rating), the facts, the director and the synopsis.
 * Anywhere but the buttons leads to the short's page: a link stretched over the whole panel. Presentational: the page's preview island positions it and keeps the state.
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
  onRemoveFromHistory,
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
        'rounded-md bg-raised shadow-lg',
        floating ? 'fixed z-(--short-preview-layer)' : 'relative',
        // It grows out of the card: no fade, so the growth itself is what you see. While entering it
        // jumps, untransitioned, onto the card's box; the transition only runs on the way out of it.
        'transition-transform duration-(--short-preview-duration) ease-standard motion-reduce:transition-none',
        'data-entering:[transform:var(--preview-from)] data-entering:transition-none',
        className,
      )}
    >
      <div className="relative aspect-still">
        {image ? (
          <>
            {/* The image is rounded itself instead of clipped by its container (steadier in the visual baselines). */}
            <img src={image} alt="" className="size-full object-cover rounded-t-md" />
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
            className="size-full rounded-t-md rounded-b-none"
          />
        )}
      </div>
      <div className="grid gap-3 p-4">
        {/* Above the panel-wide link, so the buttons keep their own actions. */}
        <div className="relative z-10 flex items-center gap-2">
          <IconButton icon="play" label={labels.play} variant="primary" href={href} />
          <LabelledIconButton
            icon={saved ? 'check' : 'plus'}
            label={saved ? labels.removeFromList : labels.addToList}
            aria-pressed={saved}
            onClick={onToggleSaved}
          />
          {onRemoveFromHistory && labels.removeFromHistory ? (
            <LabelledIconButton
              icon="close"
              label={labels.removeFromHistory}
              onClick={onRemoveFromHistory}
            />
          ) : null}
          <RatingButtons
            value={rating}
            onChange={onRate}
            labels={labels.rating}
            expanded={ratingExpanded}
            tooltip={ratingTooltip}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-primary">
          {seconds ? <Duration seconds={seconds} locale={locale} muted={false} /> : null}
          {year ? <span className="before:content-['·'] before:mr-2">{year}</span> : null}
          {typeLabel ? <span className="before:content-['·'] before:mr-2">{typeLabel}</span> : null}
          {badges?.map((badge) => (
            <Badge key={badge.label} tone={badge.tone}>
              {badge.label}
            </Badge>
          ))}
        </div>
        {directedBy ? <p className="m-0 text-meta text-secondary">{directedBy}</p> : null}
        {synopsis ? <p className="m-0 text-meta text-secondary line-clamp-3">{synopsis}</p> : null}
      </div>
      <a
        href={href}
        aria-label={labels.more}
        className="absolute inset-0 rounded-md focus-visible:focus-ring"
      />
    </div>
  )
}

/** An icon button that shows what it does in a tooltip above it, on hover and on focus. */
function LabelledIconButton(props: IconButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <IconButton {...props} />
      <Tooltip open={open}>{props.label}</Tooltip>
    </span>
  )
}
