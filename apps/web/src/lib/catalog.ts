import { formatList, type Locale, type MessageKey, type Translate } from '@fenaki/i18n'
import type { CurrentShort, NewSavedShort } from './myList.ts'
import type { BadgeTone, PosterTone, ShortCardProps } from '@fenaki/ui'

/** The catalog fields the cards, filters and badges need, from the CMS or the search index. */
export interface CardSource {
  slug: string
  title: string
  synopsis?: string | null
  directors: string[]
  year?: number | null
  durationSeconds: number
  posterTone?: string | null
  /** Absolute URL of the card-sized still, when the short has one. */
  still?: string | null
  /** Color of the text over the still. */
  stillTextColor?: 'light' | 'dark' | null
  /** The still already carries the title. */
  stillIncludesTitle?: boolean | null
  type: string
  noDialogue?: boolean | null
  brandedContent?: boolean | null
  /** Suits every audience: a badge of its own. */
  allAudiences?: boolean | null
  subtitles: string[]
  publishedAt?: string | number | null
}

const TYPES = ['fiction', 'documentary', 'animation', 'experimental']

export type DurationBand = 'short' | 'mid' | 'long'

/** Credit roles in the order pages list them (same as the CMS). */
export const CREDIT_ROLES = [
  'director',
  'writer',
  'producer',
  'cinematographer',
  'editor',
  'composer',
  'cast',
] as const

/** Duration filter bands: under 5 min, 5 to 15 min, over 15 min. */
export function durationBand(seconds: number): DurationBand {
  if (seconds < 5 * 60) return 'short'
  if (seconds <= 15 * 60) return 'mid'
  return 'long'
}

/**
 * The badges: branded content first (advertising must be identifiable), then for all audiences
 * and no dialogue. Subtitles and the type are not badges: the short's page and its preview say
 * them; what is new shows in «Novedades».
 */
export function badgesFor(short: CardSource, t: Translate): { label: string; tone?: BadgeTone }[] {
  const badges: { label: string; tone?: BadgeTone }[] = []
  if (short.brandedContent) badges.push({ label: t('badges.branded'), tone: 'branded' })
  if (short.allAudiences) badges.push({ label: t('badges.allAudiences'), tone: 'info' })
  if (short.noDialogue) badges.push({ label: t('badges.noDialogue') })
  return badges
}

/** The short's type as the viewer reads it: «Ficción», «Animación»… */
export function typeLabel(short: CardSource, t: Translate): string | undefined {
  return TYPES.find((type) => type === short.type)
    ? t(`short.types.${short.type}` as MessageKey)
    : undefined
}

const TONES: PosterTone[] = ['sala', 'tungsteno', 'plata']

export function posterTone(value: string | null | undefined): PosterTone {
  return TONES.find((tone) => tone === value) ?? 'sala'
}

export function toCard(
  short: CardSource,
  locale: Locale,
  t: Translate,
  /** The short's page. Without it the card is not a link (the landing page's sample). */
  href: string | undefined,
): ShortCardProps {
  return {
    slug: short.slug,
    title: short.title,
    synopsis: short.synopsis || undefined,
    director: short.directors.length > 0 ? formatList(short.directors, locale) : undefined,
    year: short.year ?? undefined,
    seconds: short.durationSeconds,
    locale,
    tone: posterTone(short.posterTone),
    image: short.still ?? undefined,
    imageTextColor: short.stillTextColor ?? undefined,
    imageHasTitle: short.stillIncludesTitle ?? undefined,
    href,
    badges: badgesFor(short, t),
    typeLabel: typeLabel(short, t),
  }
}

/** What «Mi lista» keeps of a short, so its rail can render cards without asking the CMS. */
export function toSavedShort(short: CardSource, locale: Locale): NewSavedShort {
  return {
    slug: short.slug,
    title: short.title,
    director: short.directors.length > 0 ? formatList(short.directors, locale) : undefined,
    year: short.year ?? undefined,
    seconds: short.durationSeconds,
    tone: posterTone(short.posterTone),
    image: short.still ?? undefined,
    imageTextColor: short.stillTextColor ?? undefined,
    imageHasTitle: short.stillIncludesTitle ?? undefined,
  }
}

/** A short's card data as «Mi lista» shows it now: what it saves, plus what it does not (see CurrentShort). */
export function toCurrentShort(short: CardSource, locale: Locale, t: Translate): CurrentShort {
  return {
    ...toSavedShort(short, locale),
    synopsis: short.synopsis || undefined,
    typeLabel: typeLabel(short, t),
    badges: badgesFor(short, t),
  }
}
