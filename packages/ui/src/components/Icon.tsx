import { cx } from '../cx.ts'

/**
 * Drawn on a 24px grid (2px padding: everything inside 2–22) and sized by optical weight, not by
 * bounding box, so the set reads at one size:
 * - straight open strokes (plus, arrow) span 16px (4–20);
 * - diagonal strokes (close) span 12px (6–18): a diagonal runs 1.41× its box;
 * - closed round shapes (the magnifier) span 15px (4.5–19.5): a ring carries more mass than lines;
 * - filled shapes (play) span 14px (5–19): fill is heavier than stroke.
 * The chevron is the one exception: tall, to sit at the cap height of a display title (Rail).
 * The «Grid» story shows them over the keylines.
 */
const PATHS = {
  // Corners rounded by the 3px round-joined stroke it is drawn with (see below): the path is inset
  // 1.5px. Its centroid sits on the centre, so the point reaches further right than the base.
  play: 'M8.5 6.5v11l9.5-5.5z',
  plus: 'M12 4v16M4 12h16',
  search: 'M10.5 16a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zM14.5 14.5l5 5',
  arrow: 'M4 12h16M14 6l6 6-6 6',
  chevron: 'M8.5 3.5 17 12l-8.5 8.5',
  close: 'M6 6l12 12M18 6 6 18',
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
  className?: string
}

/** Inline SVG on the 24px grid above, 1.75 stroke (3 when heavy), drawn in currentColor. Decorative: hidden from screen readers. */
export function Icon({ name, size = 'md', weight = 'regular', className }: IconProps) {
  const filled = name === 'play'
  return (
    <svg
      className={cx('flex-none', SIZES[size], className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled || weight === 'heavy' ? 3 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
