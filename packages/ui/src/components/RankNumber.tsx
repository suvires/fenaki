import { cx } from '../cx.ts'

export interface RankNumberProps {
  /** 1 to 10. */
  rank: number
  className?: string
}

/**
 * The big figure behind a Top 10 card: display face in `sala-1`, a shade above the page, so it
 * reads as a background shape and not as text. Its digits stand as tall as the card, baseline on
 * the card's bottom edge. Decorative: the rank is announced by `RankedItem`, never here.
 */
export function RankNumber({ rank, className }: RankNumberProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'block select-none px-3 font-display text-sala-1',
        rank >= 10 ? 'text-rank-two' : 'text-rank',
        className,
      )}
    >
      {rank}
    </span>
  )
}
