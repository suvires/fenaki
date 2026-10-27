import { cx } from '../foundations/cx.ts'

export type PosterTone = 'sala' | 'telon' | 'tungsteno' | 'plata'

export interface PosterProps {
  title: string
  director?: string
  year?: number
  /**
   * `telon` (the sponsored colour) only inside a sponsored collection. Vary tones along a rail.
   * The tone names are stored with each short (`posterTone`), so they keep their first names.
   */
  tone?: PosterTone
  /** `landscape` (16:9) is the thumbnail of a short card; portrait (2:3) is the poster of the heroes. */
  shape?: 'portrait' | 'landscape'
  className?: string
}

const TONES = {
  sala: 'bg-muted text-primary [--perf:var(--text-color-secondary)]',
  telon: 'bg-sponsored text-on-sponsored [--perf:var(--text-color-on-sponsored)]',
  tungsteno: 'bg-accent text-on-accent [--perf:var(--text-color-on-accent)]',
  plata: 'bg-info-subtle text-primary [--perf:var(--color-info)]',
} as const

/** The typographic poster: the cover a short shows until it has art cleared for use. */
export function Poster({
  title,
  director,
  year,
  tone = 'sala',
  shape = 'portrait',
  className,
}: PosterProps) {
  return (
    <div
      role="img"
      aria-label={director ? `${title}, ${director}` : title}
      className={cx(
        'relative flex flex-col justify-end gap-1 max-w-full',
        shape === 'landscape' ? 'aspect-still' : 'aspect-poster',
        'box-border overflow-hidden',
        'p-3 pl-6 rounded-sm',
        TONES[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-2 top-2 bottom-2 w-(--poster-perforation-width) rounded-xs opacity-perforation perforation"
      />
      <span className="font-display text-poster-title uppercase wrap-anywhere">{title}</span>
      {director ? <span className="text-poster-credit">{director}</span> : null}
      {year ? <span className="font-mono text-label-s opacity-secondary">{year}</span> : null}
    </div>
  )
}
