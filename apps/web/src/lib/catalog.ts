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

const NEW_FOR_DAYS = 30
const DAY = 24 * 60 * 60 * 1000

/** Duration filter bands: under 5 min, 5 to 15 min, over 15 min. */
export function durationBand(seconds: number): DurationBand {
  if (seconds < 5 * 60) return 'short'
  if (seconds <= 15 * 60) return 'mid'
  return 'long'
}

/**
 * What «Nuevo» is measured against: the current time and the public launch (LAUNCH_DATE).
 * Fixed by the server so server and client renders agree.
 */
export interface BadgeClock {
  now: number
  /** Undefined until a launch date is set: before launch, nothing is new. */
  launchedAt: number | undefined
}

/**
 * «Nuevo» marks what arrived after the launch, for 30 days. The catalog published before the
 * launch is the starting catalog, never new; before the launch no short is.
 */
export function isNew(publishedAt: CardSource['publishedAt'], clock: BadgeClock): boolean {
  const { now, launchedAt } = clock
  if (launchedAt === undefined || now < launchedAt) return false
  if (publishedAt === null || publishedAt === undefined) return false
  const time = typeof publishedAt === 'number' ? publishedAt : Date.parse(publishedAt)
  return time >= launchedAt && now - time < NEW_FOR_DAYS * DAY
}

/**
 * Up to three badges. Branded content always comes first (advertising must be identifiable), then
 * new (worked out from when the short was published on FENAKI), for all audiences and no
 * dialogue. Subtitles and the type are not badges: the short's page and its preview say them.
 */
export function badgesFor(
  short: CardSource,
  t: Translate,
  clock: BadgeClock,
): { label: string; tone?: BadgeTone }[] {
  const badges: { label: string; tone?: BadgeTone }[] = []
  if (short.brandedContent) badges.push({ label: t('badges.branded'), tone: 'branded' })
  if (isNew(short.publishedAt, clock)) badges.push({ label: t('badges.new'), tone: 'accent' })
  if (short.allAudiences) badges.push({ label: t('badges.allAudiences'), tone: 'info' })
  if (short.noDialogue) badges.push({ label: t('badges.noDialogue') })
  return badges.slice(0, 3)
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
  clock: BadgeClock,
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
    badges: badgesFor(short, t, clock),
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
export function toCurrentShort(
  short: CardSource,
  locale: Locale,
  t: Translate,
  clock: BadgeClock,
): CurrentShort {
  return {
    ...toSavedShort(short, locale),
    synopsis: short.synopsis || undefined,
    typeLabel: typeLabel(short, t),
    badges: badgesFor(short, t, clock),
  }
}
