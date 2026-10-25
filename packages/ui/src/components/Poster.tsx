import { cx } from '../cx.ts'

export type PosterTone = 'sala' | 'telon' | 'tungsteno' | 'plata'

export interface PosterProps {
  title: string
  director?: string
  year?: number
  /** `telon` only inside a sponsored collection. Vary tones along a rail. */
  tone?: PosterTone
  className?: string
}

const TONES = {
  sala: 'bg-sala-2 text-ink [--perf:var(--color-ink-muted)]',
  telon: 'bg-telon text-on-telon [--perf:var(--color-on-telon)]',
  tungsteno: 'bg-tungsteno text-on-tungsteno [--perf:var(--color-on-tungsteno)]',
  plata: 'bg-plata-soft text-ink [--perf:var(--color-plata)]',
} as const

/** The typographic poster: the cover a short shows until it has art cleared for use. */
export function Poster({ title, director, year, tone = 'sala', className }: PosterProps) {
  return (
    <div
      role="img"
      aria-label={director ? `${title}, ${director}` : title}
      className={cx(
        'relative flex flex-col justify-end gap-1 aspect-poster max-w-full box-border overflow-hidden',
        'p-3 pl-6 rounded-sm',
        TONES[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-2 top-2 bottom-2 w-(--size-perforation) rounded-xs opacity-perforation perforation"
      />
      <span className="font-display text-poster uppercase wrap-anywhere">{title}</span>
      {director ? <span className="text-credit">{director}</span> : null}
      {year ? <span className="font-mono text-label-s opacity-secondary">{year}</span> : null}
    </div>
  )
}
