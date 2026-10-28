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

/** A link to a theme's page, sized like a short card so it sits in a Rail or a grid. */
export function TopicCard({ title, href, meta, stretch = false, className }: TopicCardProps) {
  return (
    <a
      href={href}
      className={cx(
        'grid content-end gap-2 aspect-still p-4 rounded-sm bg-raised border border-subtle',
        'text-primary no-underline hover:bg-muted focus-visible:focus-ring',
        'transition-[background-color] duration-(--duration-fast) ease-standard motion-reduce:transition-none',
        stretch ? 'w-full' : 'w-(--short-card-width)',
        className,
      )}
    >
      <span className="font-display text-title uppercase text-balance">{title}</span>
      {meta ? <span className="font-mono text-label uppercase text-secondary">{meta}</span> : null}
    </a>
  )
}
