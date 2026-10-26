import { useId } from 'react'
import { cx } from '../cx.ts'

/**
 * Drawn on a 24px grid (2px padding: everything inside 2–22) and sized by optical weight, not by
 * bounding box, so the set reads at one size:
 * - straight open strokes (plus, arrow) span 16px (4–20);
 * - diagonal strokes (close) span 13px (5.5–18.5): a diagonal runs 1.41× its box;
 * - the check spans 13px wide (5.5–18.5), like the close: both are diagonals;
 * - closed round shapes (the magnifier) span 15.5px (4.5–20): a ring carries more mass than lines;
 * - the play triangle spans 17px (3.5–20.5): a triangle fills only half its box, so it needs
 *   more height than the plus to read at the same size.
 * - the thumbs-up, a closed shape of mixed lines and curves, spans 16px wide and 15.5px tall (4–20.3, 4.5–20).
 * - the thumbs-down is the thumbs-up mirrored; the double thumbs-up is two of them at 74 %, the back
 *   one showing only its cuff and thumb, so the pair spans 16px wide and 14.7px tall (4–20.3, 4.4–19).
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
  'chevron-down': 'M5.5 8.75 12 15.25l6.5-6.5',
  // A cuff and a hand: the thumb's edge, the knuckle curve, the palm and the heel back to the cuff.
  'thumbs-up':
    'M4 11.5h3.5V20H4zM7.5 11.5 11 4.5a2.5 2.5 0 0 1 2.5 2.5v3.5h5.3a1.5 1.5 0 0 1 1.5 1.75l-1 6.5A2 2 0 0 1 17.3 20H7.5',
  'thumbs-down':
    'M4 12.5h3.5V4H4zM7.5 12.5 11 19.5a2.5 2.5 0 0 0 2.5-2.5v-3.5h5.3a1.5 1.5 0 0 0 1.5-1.75l-1-6.5A2 2 0 0 0 17.3 4H7.5',
  'thumbs-up-double':
    'M8.24 12.71H10.83V19H8.24ZM10.83 12.71 13.42 7.53a1.85 1.85 0 0 1 1.85 1.85v2.59h3.92a1.11 1.11 0 0 1 1.11 1.29l-.74 4.81A1.48 1.48 0 0 1 18.08 19H10.83M4.04 10.51H6.63V16.8H4.04ZM6.63 10.51 9.22 5.33a1.85 1.85 0 0 1 1.85 1.85v1.2',
  check: 'M5.5 12.5l4.5 4.5 8.5-9.5',
  close: 'M5.5 5.5l13 13M18.5 5.5l-13 13',
} as const

/**
 * The thumbs have a filled variant (a rating that is chosen). Same outline, drawn to be filled:
 * the cuff is narrowed and the hand starts further right, so that with the stroke they stay two
 * shapes with a hairline between them instead of merging into one block.
 * Filled, the double thumbs-up draws its back thumb whole, offset up and left, with the front
 * thumb's outline cut out of it (an SVG mask), so the two never merge into one shape.
 */
const FILLED_PATHS = {
  'thumbs-up':
    'M4 11.5h2V20H4zM8.5 11.5 11 4.5a2.5 2.5 0 0 1 2.5 2.5v3.5h5.3a1.5 1.5 0 0 1 1.5 1.75l-1 6.5A2 2 0 0 1 17.3 20H8.5z',
  'thumbs-down':
    'M4 12.5h2V4H4zM8.5 12.5 11 19.5a2.5 2.5 0 0 0 2.5-2.5v-3.5h5.3a1.5 1.5 0 0 0 1.5-1.75l-1-6.5A2 2 0 0 0 17.3 4H8.5z',
  // The front thumb only: the back one is the same shape, offset and cut around it (see below).
  'thumbs-up-double':
    'M8.24 12.71h2V19h-2zM12.2 12.71 13.42 7.53a1.85 1.85 0 0 1 1.85 1.85v2.59h3.92a1.11 1.11 0 0 1 1.11 1.29l-.74 4.81A1.48 1.48 0 0 1 18.08 19H12.2z',
} as const

/** Where the filled double thumbs-up draws its back thumb: the front one, up and to the left. */
const BACK_THUMB = 'translate(-5.6 -3.4)'
/** The gap cut around the front thumb, so the two filled thumbs never merge into one shape. */
const BACK_THUMB_GAP = 4

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
  const stacked = name === 'thumbs-up-double' && variant !== undefined
  return (
    <svg
      className={cx('flex-none', SIZES[size], className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={name === 'play' || weight === 'heavy' ? 3 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {stacked ? (
        <>
          {/* The back thumb, with the front one's outline (plus a gap) cut out of it. */}
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="white" stroke="none" />
            <path d={variant} fill="black" stroke="black" strokeWidth={BACK_THUMB_GAP} />
          </mask>
          <g mask={`url(#${maskId})`}>
            <path d={variant} transform={BACK_THUMB} />
          </g>
        </>
      ) : null}
      <path d={variant ?? PATHS[name]} />
    </svg>
  )
}
