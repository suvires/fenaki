import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { cx } from '../cx.ts'
import { IconButton } from './IconButton.tsx'
import type { IconName } from './Icon.tsx'
import { Tooltip } from './Tooltip.tsx'

export type Rating = 'dislike' | 'like' | 'love'

export interface RatingButtonsProps {
  /** The viewer's rating, if any. */
  value?: Rating
  /** Called with the new rating, or `undefined` when the chosen one is clicked again. */
  onChange?: (value: Rating | undefined) => void
  labels: {
    /** The collapsed button: «Valorar». */
    rate: string
    /** «No es para mí» */
    dislike: string
    /** «Me gusta» */
    like: string
    /** «¡Me encanta!» */
    love: string
  }
  /** Show the expanded pill without hovering: for previews and visual tests only. */
  expanded?: boolean
  /** Show this option's tooltip without hovering: for previews and visual tests only. */
  tooltip?: Rating
  className?: string
}

const CHOICES: { value: Rating; icon: IconName }[] = [
  { value: 'dislike', icon: 'thumbs-down' },
  { value: 'like', icon: 'thumbs-up' },
  { value: 'love', icon: 'thumbs-up-double' },
]

const ICONS: Record<Rating, IconName> = {
  dislike: 'thumbs-down',
  like: 'thumbs-up',
  love: 'thumbs-up-double',
}

/**
 * Rating, as in a streaming service: one round button that shows the current rating (a filled
 * thumb, or the outlined thumbs-up when unrated). On hover or focus it opens, over the buttons
 * beside it and without moving them, into a pill with the three options, each with a tooltip.
 * Escape, or focus or the pointer leaving, closes it. Presentational: the page keeps the value.
 */
export function RatingButtons({
  value,
  onChange,
  labels,
  expanded = false,
  tooltip,
  className,
}: RatingButtonsProps) {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState<Rating | undefined>(undefined)
  const root = useRef<HTMLSpanElement>(null)
  const rest = useRef<HTMLButtonElement>(null)
  const restoring = useRef(false)
  const open = expanded || (!dismissed && (hover || focus))

  const onFocus = () => {
    if (restoring.current) {
      restoring.current = false
      return
    }
    setFocus(true)
    setDismissed(false)
  }
  const onBlur = (event: FocusEvent) => {
    if (root.current?.contains(event.relatedTarget as Node | null)) return
    setFocus(false)
    setDismissed(false)
    setActive(undefined)
  }
  /** Folds the pill; focus inside it goes back to the rate button, not lost in a hidden one. */
  const fold = () => {
    setDismissed(true)
    setActive(undefined)
    if (root.current?.contains(document.activeElement) && document.activeElement !== rest.current) {
      restoring.current = true
      rest.current?.focus()
    }
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !open) return
    // The preview closes on Escape too (it skips events already handled): this only folds the pill.
    event.stopPropagation()
    event.preventDefault()
    fold()
  }

  return (
    <span
      ref={root}
      onPointerEnter={() => {
        setHover(true)
        setDismissed(false)
      }}
      onPointerLeave={() => {
        setHover(false)
        setActive(undefined)
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={cx('relative inline-flex flex-none size-(--size-control-md)', className)}
    >
      <IconButton
        ref={rest}
        icon={value ? ICONS[value] : 'thumbs-up'}
        filled={Boolean(value)}
        label={labels.rate}
        className={open ? 'opacity-0' : undefined}
      />
      <span
        role="group"
        aria-label={labels.rate}
        data-open={open ? '' : undefined}
        className={cx(
          // The pill's buttons are as big as the one it opens from, centred on it, with a little padding.
          'absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 p-1',
          'rounded-control bg-sala-2/(--opacity-pill) backdrop-blur-veil shadow-card',
          // Unfolds from the rate button and folds back into it: width and opacity, both ways.
          'transition-[opacity,scale,visibility] duration-(--duration-pill) ease-standard motion-reduce:transition-none',
          'invisible opacity-0 scale-x-(--scale-pill-folded) data-open:visible data-open:opacity-100 data-open:scale-x-100',
        )}
      >
        {CHOICES.map((choice) => (
          <span
            key={choice.value}
            className="relative inline-flex"
            onPointerEnter={() => setActive(choice.value)}
            onPointerLeave={() => setActive(undefined)}
            onFocus={() => setActive(choice.value)}
            onBlur={() => setActive(undefined)}
          >
            <IconButton
              icon={choice.icon}
              filled={value === choice.value}
              label={labels[choice.value]}
              variant="ghost"
              aria-pressed={value === choice.value}
              onClick={() => {
                onChange?.(value === choice.value ? undefined : choice.value)
                // A choice made, the pill folds back into the rate button.
                fold()
              }}
            />
            <Tooltip open={open && (active ?? tooltip) === choice.value}>
              {labels[choice.value]}
            </Tooltip>
          </span>
        ))}
      </span>
    </span>
  )
}
