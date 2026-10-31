import { cx } from '../foundations/cx.ts'

export interface TopicCardProps {
  /** The theme: «Memoria e historia». */
  title: string
  href: string
  /** Under the title, in the timecode voice: «120 cortos». */
  meta?: string
  /** Fill the grid cell instead of the fixed rail width. */
  stretch?: boolean
  className?: string
}

/**
 * A link to a theme's page, drawn like the typographic poster in its default tone (film
 * perforations down the left edge, as in the collections) and sized like a short card so it sits
 * in a Rail or a grid.
 */
export function TopicCard({ title, href, meta, stretch = false, className }: TopicCardProps) {
  return (
    <a
      href={href}
      className={cx(
        'relative grid content-end gap-2 aspect-still box-border overflow-hidden',
        'p-4 pl-8 rounded-sm bg-muted text-primary [--perf:var(--text-color-secondary)]',
        'no-underline focus-visible:focus-ring',
        'transition-transform duration-(--duration-fast) ease-standard hover:-translate-y-1',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        stretch ? 'w-full' : 'w-(--short-card-width)',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-2 top-2 bottom-2 w-(--poster-perforation-width) rounded-xs opacity-perforation perforation"
      />
      <span className="font-display text-title uppercase text-balance">{title}</span>
      {meta ? <span className="font-mono text-label uppercase text-secondary">{meta}</span> : null}
    </a>
  )
}
