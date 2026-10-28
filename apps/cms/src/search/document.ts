/** The shape of a short in the search index. One index per locale. */
export interface ShortSearchDocument {
  id: number
  slug: string
  title: string
  synopsis: string
  directors: string[]
  people: string[]
  year: number | null
  durationSeconds: number
  country: string | null
  /** BCP 47; `zxx` when the short has no dialogue. */
  originalLanguage: string | null
  /** Duration filter: under 5 min, 5 to 15, over 15 (same bands as the site's home filters). */
  durationBand: DurationBand
  /** Animation or live action, a filter of its own next to the type. */
  form: 'animation' | 'live-action'
  type: string
  /** The type in the index's locale («Animación»), so viewers can search by it. */
  typeLabel: string
  /** Genres and themes (catalog/taxonomy.ts): filters of the catalog. */
  genres: string[]
  themes: string[]
  /** `all` when the short suits every audience, a filter of its own; null otherwise. */
  audience: 'all' | null
  /** The genres and themes in the index's locale («Terror», «Familia»), to search by them. */
  classLabels: string[]
  posterTone: string
  /** Path of the card-sized still on the CMS origin, or null when the short has none. */
  still: string | null
  /** Color of the text over the still (`light` on dark images), or null without a still. */
  stillTextColor: 'light' | 'dark' | null
  /** The still already carries the title. */
  stillIncludesTitle: boolean
  noDialogue: boolean
  /** Made by or for a brand: cards show a «Contenido de marca» badge. */
  brandedContent: boolean
  subtitles: string[]
  publishedAt: number | null
}

export type DurationBand = 'short' | 'mid' | 'long'

/** Under 5 min, 5 to 15 min, over 15 min. */
export function durationBand(seconds: number): DurationBand {
  if (seconds < 5 * 60) return 'short'
  if (seconds <= 15 * 60) return 'mid'
  return 'long'
}

/** Every filter of the browse page (/es/cortos) is a facet. */
export const SHORTS_INDEX_SETTINGS = {
  searchableAttributes: ['title', 'directors', 'people', 'typeLabel', 'classLabels', 'synopsis'],
  filterableAttributes: [
    'type',
    'genres',
    'themes',
    'audience',
    'form',
    'durationSeconds',
    'durationBand',
    'subtitles',
    'noDialogue',
    'originalLanguage',
    'year',
    'country',
  ],
  sortableAttributes: ['publishedAt', 'year', 'durationSeconds'],
  displayedAttributes: ['*'],
}

/**
 * One index per locale. SEARCH_INDEX_PREFIX keeps other databases apart on the same Meilisearch,
 * such as the e2e tests' (`test_shorts_es`).
 */
export function shortsIndexName(
  locale: string,
  prefix = process.env.SEARCH_INDEX_PREFIX ?? '',
): string {
  return `${prefix}shorts_${locale}`
}

interface PersonLike {
  name: string
}

/** The fields of a localized, depth-populated short that the indexer reads. */
export interface IndexableShort {
  id: number
  slug?: string | null
  title: string
  synopsis?: string | null
  durationSeconds: number
  year?: number | null
  country?: string | null
  originalLanguage?: string | null
  type: string
  genres?: string[] | null
  themes?: string[] | null
  allAudiences?: boolean | null
  posterTone?: string | null
  still?:
    | number
    | {
        url?: string | null
        sizes?: { card?: { url?: string | null } | null } | null
        textColor?: 'light' | 'dark' | null
        includesTitle?: boolean | null
      }
    | null
  noDialogue?: boolean | null
  brandedContent?: boolean | null
  publishedAt?: string | null
  credits?: { person: number | PersonLike; role: string }[] | null
  sources?: { docs?: (number | { subtitles?: string[] | null; status?: string | null })[] } | null
}

const nameOf = (person: number | PersonLike) => (typeof person === 'object' ? person.name : null)

export function toSearchDocument(
  short: IndexableShort,
  typeLabel: string,
  classLabels: string[] = [],
): ShortSearchDocument {
  const credits = short.credits ?? []
  const names = (role?: string) =>
    credits
      .filter((c) => !role || c.role === role)
      .map((c) => nameOf(c.person))
      .filter((n): n is string => Boolean(n))
  // By primary language: «es-ES» and «es» are both Spanish subtitles.
  const subtitles = new Set(
    (short.sources?.docs ?? [])
      .flatMap((s) => (typeof s === 'object' ? (s.subtitles ?? []) : []))
      .map((code) => code.split('-')[0]?.toLowerCase() ?? code),
  )
  return {
    id: short.id,
    slug: short.slug ?? String(short.id),
    title: short.title,
    synopsis: short.synopsis ?? '',
    directors: names('director'),
    people: [...new Set(names())],
    year: short.year ?? null,
    durationSeconds: short.durationSeconds,
    country: short.country ?? null,
    originalLanguage: short.noDialogue ? 'zxx' : (short.originalLanguage ?? null),
    durationBand: durationBand(short.durationSeconds),
    form: short.type === 'animation' ? 'animation' : 'live-action',
    type: short.type,
    typeLabel,
    genres: short.genres ?? [],
    themes: short.themes ?? [],
    audience: short.allAudiences ? 'all' : null,
    classLabels,
    posterTone: short.posterTone ?? 'sala',
    still:
      typeof short.still === 'object' && short.still
        ? (short.still.sizes?.card?.url ?? short.still.url ?? null)
        : null,
    stillTextColor:
      typeof short.still === 'object' && short.still ? (short.still.textColor ?? 'light') : null,
    stillIncludesTitle: typeof short.still === 'object' && Boolean(short.still?.includesTitle),
    noDialogue: Boolean(short.noDialogue),
    brandedContent: Boolean(short.brandedContent),
    subtitles: [...subtitles],
    publishedAt: short.publishedAt ? Date.parse(short.publishedAt) : null,
  }
}
