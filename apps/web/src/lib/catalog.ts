import { formatList, type Locale, type Translate } from '@shortix/i18n'
import type { BadgeTone, PosterTone, ShortCardProps } from '@shortix/ui'

/** The catalog fields the cards, filters and badges need, from the CMS or the search index. */
export interface CardSource {
  slug: string
  title: string
  directors: string[]
  year?: number | null
  durationSeconds: number
  posterTone?: string | null
  type: string
  noDialogue?: boolean | null
  brandedContent?: boolean | null
  subtitles: string[]
  publishedAt?: string | number | null
}

export type DurationBand = 'short' | 'mid' | 'long'

const NEW_FOR_DAYS = 30
const DAY = 24 * 60 * 60 * 1000

/** Duration filter bands: under 5 min, 5 to 15 min, over 15 min. */
export function durationBand(seconds: number): DurationBand {
  if (seconds < 5 * 60) return 'short'
  if (seconds <= 15 * 60) return 'mid'
  return 'long'
}

export function isNew(publishedAt: CardSource['publishedAt'], now = Date.now()): boolean {
  if (publishedAt === null || publishedAt === undefined) return false
  const time = typeof publishedAt === 'number' ? publishedAt : Date.parse(publishedAt)
  return now - time < NEW_FOR_DAYS * DAY
}

/**
 * Up to three badges. Branded content always comes first (advertising must be identifiable), then
 * the most useful: new, subtitles in the viewer's language, then form.
 */
export function badgesFor(
  short: CardSource,
  locale: Locale,
  t: Translate,
  now = Date.now(),
): { label: string; tone?: BadgeTone }[] {
  const badges: { label: string; tone?: BadgeTone }[] = []
  if (short.brandedContent) badges.push({ label: t('badges.branded'), tone: 'branded' })
  if (isNew(short.publishedAt, now)) badges.push({ label: t('badges.new'), tone: 'accent' })
  if (short.subtitles.includes(locale))
    badges.push({ label: t('badges.subtitles', { language: locale.toUpperCase() }), tone: 'info' })
  if (short.noDialogue) badges.push({ label: t('badges.noDialogue') })
  else if (short.type === 'animation') badges.push({ label: t('short.types.animation') })
  return badges.slice(0, 3)
}

const TONES: PosterTone[] = ['sala', 'tungsteno', 'plata']

export function posterTone(value: string | null | undefined): PosterTone {
  return TONES.find((tone) => tone === value) ?? 'sala'
}

export function toCard(
  short: CardSource,
  locale: Locale,
  t: Translate,
  href: string,
  now = Date.now(),
): ShortCardProps {
  return {
    title: short.title,
    director: short.directors.length > 0 ? formatList(short.directors, locale) : undefined,
    year: short.year ?? undefined,
    seconds: short.durationSeconds,
    locale,
    tone: posterTone(short.posterTone),
    href,
    badges: badgesFor(short, locale, t, now),
  }
}

/** Data attributes the home filters read to show or hide a card. */
export function filterAttributes(short: CardSource, locale: Locale) {
  return {
    'data-card': '',
    'data-band': durationBand(short.durationSeconds),
    'data-subtitles': short.subtitles.includes(locale) ? 'yes' : 'no',
  }
}
