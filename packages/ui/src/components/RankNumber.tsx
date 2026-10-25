import { cx } from '../cx.ts'

export interface RankNumberProps {
  /** 1 to 10. */
  rank: number
  className?: string
}

/**
 * The big outlined figure behind a Top 10 card: display face, a grey gradient fill (dark at the
 * bottom, line-strong at the top) and a line-strong stroke, so it reads as a background shape and
 * not as text. Decorative: the rank is announced by `RankedItem`, never here.
 */
export function RankNumber({ rank, className }: RankNumberProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'block select-none px-3 py-2 font-display bg-linear-to-t from-sala-0 to-line-strong bg-clip-text text-transparent',
        '[-webkit-text-stroke:var(--size-rank-stroke)_var(--color-line-strong)]',
        rank >= 10 ? 'text-rank-two-sm md:text-rank-two' : 'text-rank-sm md:text-rank',
        className,
      )}
    >
      {rank}
    </span>
  )
}
