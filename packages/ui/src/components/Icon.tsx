import { cx } from '../cx.ts'

const PATHS = {
  play: 'M8 5.5v13l11-6.5z',
  plus: 'M12 5v14M5 12h14',
  search: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM15.5 15.5 20 20',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  // Tall, to sit at the cap height of a display title (Rail).
  chevron: 'M8.5 3.5 17 12l-8.5 8.5',
} as const

export type IconName = keyof typeof PATHS

const SIZES = {
  xs: 'size-(--size-icon-xs)',
  sm: 'size-(--size-icon-sm)',
  md: 'size-(--size-icon-md)',
  lg: 'size-(--size-icon-lg)',
} as const

export interface IconProps {
  name: IconName
  size?: keyof typeof SIZES
  /** `heavy` matches bold display type (a rail title's chevron). */
  weight?: 'regular' | 'heavy'
  className?: string
}

/** Inline SVG on a 24px grid, 1.75 stroke (3 when heavy), drawn in currentColor. Decorative: hidden from screen readers. */
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
