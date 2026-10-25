import { cx } from '../cx.ts'

/**
 * Drawn on a 24px grid: 2px padding, so everything sits in the 20px live area (2–22), and each
 * shape fills its keyline so the set reads at one size. Stroked lines span 16px (4–20); diagonals
 * 14px (5–19), as they read longer; filled shapes span 16px too, nudged so their weight centres.
 * The «Grid» story shows them over the keylines.
 */
const PATHS = {
  // Filled; its centroid sits on the centre, so the point reaches further right than the base.
  play: 'M7 4v16l13.5-8z',
  plus: 'M12 4v16M4 12h16',
  search: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM15.5 15.5 20 20',
  arrow: 'M4 12h16M14 6l6 6-6 6',
  // Tall, to sit at the cap height of a display title (Rail).
  chevron: 'M8.5 3.5 17 12l-8.5 8.5',
  close: 'M5 5l14 14M19 5 5 19',
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
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={weight === 'heavy' ? 3 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
