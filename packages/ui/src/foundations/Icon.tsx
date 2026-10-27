import { useId } from 'react'
import { cx } from './cx.ts'

/**
 * Drawn on a 24px grid (2px padding: everything inside 2–22) and sized by optical weight, not by
 * bounding box, so the set reads at one size:
 * - straight open strokes (plus, arrow) span 16px (4–20);
 * - diagonal strokes (close) span 13px (5.5–18.5): a diagonal runs 1.41× its box;
 * - the check spans 13px wide (5.5–18.5), like the close: both are diagonals;
 * - closed round shapes (the magnifier) span 15.5px (4.5–20): a ring carries more mass than lines;
 * - the play triangle spans 17px (3.5–20.5): a triangle fills only half its box, so it needs
 *   more height than the plus to read at the same size.
 * - the thumbs-up, one closed outline of cuff and hand (mixed lines and curves), spans 16px wide and
 *   15.5px tall (4–20.3, 4.5–20).
 * - the thumbs-down is the thumbs-up mirrored; the double thumbs-up is two whole thumbs-up at 74 %
 *   (see DOUBLE), so the pair spans the same box as a single one.
 * The chevron is the one exception: tall, to sit at the cap height of a display title (Rail). The
 * chevron-down is a plain diagonal pair, 13px wide like the check and the close.
 * The «Grid» story shows them over the keylines.
 */
const PATHS = {
  // Corners rounded by the 3px round-joined stroke it is drawn with (see below): the path is inset
  // 1.5px. Its centroid sits on the centre, so the point reaches further right than the base.
  play: 'M8 5v14l12-7z',
  plus: 'M12 4v16M4 12h16',
  search: 'M10.5 16.5a6 6 0 1 1 0-12 6 6 0 0 1 0 12zM15 15l5 5',
  arrow: 'M4 12h16M14 6l6 6-6 6',
  chevron: 'M8.5 3.5 17 12l-8.5 8.5',
  // A V carries its weight in its open top: centred by its box it looks high, so it sits 1px lower.
  'chevron-down': 'M5.5 9.75 12 16.25l6.5-6.5',
  // One outline, cuff and hand: no line between them. The cuff, the thumb's edge, the knuckle
  // curve, the palm and the heel back along the cuff's foot.
  'thumbs-up':
    'M4 11.5h3.5L11 4.5a2.5 2.5 0 0 1 2.5 2.5v3.5h5.3a1.5 1.5 0 0 1 1.5 1.75l-1 6.5A2 2 0 0 1 17.3 20H4z',
  'thumbs-down':
    'M4 12.5h3.5L11 19.5a2.5 2.5 0 0 0 2.5-2.5v-3.5h5.3a1.5 1.5 0 0 0 1.5-1.75l-1-6.5A2 2 0 0 0 17.3 4H4z',
  // Drawn from two thumbs-up (see DOUBLE below): the path here is the single one.
  'thumbs-up-double':
    'M4 11.5h3.5L11 4.5a2.5 2.5 0 0 1 2.5 2.5v3.5h5.3a1.5 1.5 0 0 1 1.5 1.75l-1 6.5A2 2 0 0 1 17.3 20H4z',
  check: 'M5.5 12.5l4.5 4.5 8.5-9.5',
  close: 'M5.5 5.5l13 13M18.5 5.5l-13 13',
} as const

/**
 * The thumbs have a filled variant (a rating that is chosen): the very same shape, filled.
 */
const FILLED_PATHS = {
  'thumbs-up': PATHS['thumbs-up'],
  'thumbs-down': PATHS['thumbs-down'],
  'thumbs-up-double': PATHS['thumbs-up-double'],
} as const

/**
 * The double thumbs-up is two single thumbs-up at 74 %: the back one up and to the right, the
 * front one down and to the left, the pair centred like a single thumb. The back one has the front
 * one's outline cut out of it (an SVG mask) with a gap, so outlined or filled they stay two thumbs.
 * Strokes are divided by the scale so they match the single thumbs.
 */
const DOUBLE = {
  scale: 0.74,
  back: 'translate(5.44 1.17) scale(0.74)',
  front: 'translate(1.04 5.17) scale(0.74)',
  /** Gap cut around the front thumb, in its own (scaled) units. */
  gap: 5,
} as const

export type IconName = keyof typeof PATHS

export const ICON_NAMES = Object.keys(PATHS) as IconName[]

const SIZES = {
  xs: 'size-(--size-icon-xs)',
  sm: 'size-(--size-icon-sm)',
  md: 'size-(--size-icon-md)',
  lg: 'size-(--size-icon-lg)',
  xl: 'size-(--size-icon-xl)',
} as const

export interface IconProps {
  name: IconName
  size?: keyof typeof SIZES
  /** `heavy` matches bold display type (a rail title's chevron). */
  weight?: 'regular' | 'heavy'
  /** The filled variant, for the icons that have one (the thumbs): a chosen rating. */
  filled?: boolean
  className?: string
}

/** Inline SVG on the 24px grid above, 1.75 stroke (3 when heavy), drawn in currentColor. Decorative: hidden from screen readers. */
export function Icon({
  name,
  size = 'md',
  weight = 'regular',
  filled: chosen = false,
  className,
}: IconProps) {
  const variant = chosen ? FILLED_PATHS[name as keyof typeof FILLED_PATHS] : undefined
  const filled = name === 'play' || variant !== undefined
  const maskId = useId()
  const strokeWidth = name === 'play' || weight === 'heavy' ? 3 : 1.75
  const d = variant ?? PATHS[name]
  return (
    <svg
      className={cx('flex-none', SIZES[size], className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'thumbs-up-double' ? (
        <g strokeWidth={strokeWidth / DOUBLE.scale}>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="white" stroke="none" />
            <path
              d={d}
              transform={DOUBLE.front}
              fill="black"
              stroke="black"
              strokeWidth={DOUBLE.gap}
            />
          </mask>
          <g mask={`url(#${maskId})`}>
            <path d={d} transform={DOUBLE.back} />
          </g>
          <path d={d} transform={DOUBLE.front} />
        </g>
      ) : (
        <path d={d} />
      )}
    </svg>
  )
}
