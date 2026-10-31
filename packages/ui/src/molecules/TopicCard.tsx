import { cx } from '../foundations/cx.ts'
import type { PosterTone } from '../atoms/Poster.tsx'

/** The poster tones a theme can take: `telon` is the sponsored colour, never a theme's. */
export type TopicTone = Exclude<PosterTone, 'telon'>

export interface TopicCardProps {
  /** The theme: «Memoria e historia». */
  title: string
  href: string
  /** Under the title, in the timecode voice: «120 cortos». */
  meta?: string
  /** The poster tone. Vary it along a rail; keep a theme's tone the same on every page. */
  tone?: TopicTone
  /** Fill the grid cell instead of the fixed rail width. */
  stretch?: boolean
  className?: string
}

const TONES: Record<TopicTone, string> = {
  sala: 'bg-muted text-primary [--perf:var(--text-color-secondary)]',
  tungsteno: 'bg-accent text-on-accent [--perf:var(--text-color-on-accent)]',
  plata: 'bg-info-subtle text-primary [--perf:var(--color-info)]',
}

/**
 * A link to a theme's page, drawn like the typographic poster (film perforations down the left
 * edge, a poster tone) and sized like a short card so it sits in a Rail or a grid.
 */
export function TopicCard({
  title,
  href,
  meta,
  tone = 'sala',
  stretch = false,
  className,
}: TopicCardProps) {
  return (
    <a
      href={href}
      className={cx(
        'relative grid content-end gap-2 aspect-still box-border overflow-hidden',
        'p-4 pl-8 rounded-sm no-underline focus-visible:focus-ring',
        'transition-transform duration-(--duration-fast) ease-standard hover:-translate-y-1',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        TONES[tone],
        stretch ? 'w-full' : 'w-(--short-card-width)',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-2 top-2 bottom-2 w-(--poster-perforation-width) rounded-xs opacity-perforation perforation"
      />
      <span className="font-display text-title uppercase text-balance">{title}</span>
      {meta ? (
        <span className="font-mono text-label uppercase opacity-secondary">{meta}</span>
      ) : null}
    </a>
  )
}
