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
  type: string
  /** The type in the index's locale («Animación»), so viewers can search by it. */
  typeLabel: string
  posterTone: string
  noDialogue: boolean
  subtitles: string[]
  publishedAt: number | null
}

export const SHORTS_INDEX_SETTINGS = {
  searchableAttributes: ['title', 'directors', 'people', 'typeLabel', 'synopsis'],
  filterableAttributes: ['type', 'durationSeconds', 'subtitles', 'noDialogue', 'year', 'country'],
  sortableAttributes: ['publishedAt', 'year', 'durationSeconds'],
  displayedAttributes: ['*'],
}

export function shortsIndexName(locale: string): string {
  return `shorts_${locale}`
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
  type: string
  posterTone?: string | null
  noDialogue?: boolean | null
  publishedAt?: string | null
  credits?: { person: number | PersonLike; role: string }[] | null
  sources?: { docs?: (number | { subtitles?: string[] | null; status?: string | null })[] } | null
}

const nameOf = (person: number | PersonLike) => (typeof person === 'object' ? person.name : null)

export function toSearchDocument(short: IndexableShort, typeLabel: string): ShortSearchDocument {
  const credits = short.credits ?? []
  const names = (role?: string) =>
    credits
      .filter((c) => !role || c.role === role)
      .map((c) => nameOf(c.person))
      .filter((n): n is string => Boolean(n))
  const subtitles = new Set(
    (short.sources?.docs ?? []).flatMap((s) => (typeof s === 'object' ? (s.subtitles ?? []) : [])),
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
    type: short.type,
    typeLabel,
    posterTone: short.posterTone ?? 'sala',
    noDialogue: Boolean(short.noDialogue),
    subtitles: [...subtitles],
    publishedAt: short.publishedAt ? Date.parse(short.publishedAt) : null,
  }
}
