import { cx } from '../foundations/cx.ts'

/** The phrase of a headline drawn in the accent colour: its closing payoff. */
export interface HeadlineAccent {
  accent: string
}

export interface AccentHeadlineProps {
  /**
   * The headline in pieces: plain text and exactly one accent, as the rich translator returns them
   * (`rich('landing.hero.title', { accent: { accent: t('landing.hero.titleAccent') } })`), so each
   * language places its accent where its closing phrase falls.
   */
  parts: (string | HeadlineAccent)[]
  as?: 'h1' | 'h2' | 'h3' | 'p'
  /** `responsive` is display-l on small screens and display-xl from md up. */
  size?: 'l' | 'xl' | 'responsive'
  className?: string
}

const SIZES = {
  l: 'text-display-l',
  xl: 'text-display-xl',
  responsive: 'text-display-l md:text-display-xl',
} as const

/**
 * A two-tone display headline: the text colour, with one span, the closing phrase that carries the
 * payoff, in the accent text colour. Never the whole headline, never the brand name, never more
 * than one span.
 */
export function AccentHeadline({
  parts,
  as: Tag = 'h1',
  size = 'responsive',
  className,
}: AccentHeadlineProps) {
  const accents = parts.filter((part) => typeof part !== 'string')
  if (accents.length !== 1)
    throw new Error(`AccentHeadline takes exactly one accent, got ${accents.length}`)
  const plain = parts
    .filter((part) => typeof part === 'string')
    .join('')
    .trim()
  if (!plain) throw new Error('AccentHeadline: the accent cannot be the whole headline')
  if (/fenaki/i.test(accents[0]?.accent ?? ''))
    throw new Error('AccentHeadline: never accent the brand name')
  return (
    <Tag
      className={cx('m-0 font-display uppercase text-balance text-primary', SIZES[size], className)}
    >
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <span key={i} className="text-accent">
            {part.accent}
          </span>
        ),
      )}
    </Tag>
  )
}
