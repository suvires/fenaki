import type { ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'
import { Rail, type RailProps } from './Rail.tsx'
import { RankNumber } from '../atoms/RankNumber.tsx'

/** A Top 10 rail: the same row (or slider, with `arrows`) as `Rail`, filled with `RankedItem`s. */
export function RankedRail(props: RailProps) {
  return <Rail {...props} />
}

export interface RankedItemProps {
  /** 1 to 10. */
  rank: number
  /** What a screen reader says before the card, e.g. «Puesto 1». The figure itself is hidden. */
  rankLabel: string
  className?: string
  /** The short's card. */
  children: ReactNode
}

/** A rank number with the card overlapping its right side. */
export function RankedItem({ rank, rankLabel, className, children }: RankedItemProps) {
  return (
    <div className={cx('flex items-end', className)}>
      <RankNumber rank={rank} className="-mr-(--ranked-rail-overlap)" />
      <div className="relative">
        <span className="sr-only">{rankLabel}. </span>
        {children}
      </div>
    </div>
  )
}
