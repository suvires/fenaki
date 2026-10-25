import type {
  Collection,
  License,
  Media,
  Person,
  Short,
  Showcase,
  Source,
  Sponsor,
  Still,
} from '@fenaki/cms/types'
import type { Locale } from '@fenaki/i18n'
import { CMS_PUBLIC_URL, CMS_URL } from 'astro:env/server'
import type { CardSource } from './catalog.ts'
import { rankedShorts } from './ranking.ts'

/** Reads the catalog through Payload's REST API. Only published documents are visible here. */
async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`/api/${path}`, CMS_URL)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`CMS ${response.status} for ${url.pathname}${url.search}`)
  return (await response.json()) as T
}

/** A published short always has a running time and a type: the CMS requires them to publish. */
export type PublishedShort = Short & { durationSeconds: number; type: NonNullable<Short['type']> }

interface List<T> {
  docs: T[]
  totalDocs: number
}

/** Populates credits (people) and the join field of sources. */
const SHORT_DEPTH = 1

export async function listShorts(locale: Locale, limit = 100): Promise<PublishedShort[]> {
  const list = await get<List<PublishedShort>>('shorts', {
    locale,
    depth: SHORT_DEPTH,
    limit,
    sort: '-publishedAt',
    'where[status][equals]': 'published',
  })
  return list.docs
}

/** The nightly «Lo más visto» ranking: published shorts, most played of the last 7 days first. */
export async function getRanking(locale: Locale): Promise<PublishedShort[]> {
  try {
    // Depth 2: the global's relationships, and their stills and credits.
    const ranking = await get<{ shorts?: (number | Short)[] | null }>('globals/ranking', {
      locale,
      depth: SHORT_DEPTH + 1,
    })
    return rankedShorts(ranking)
  } catch {
    // The home page does not depend on the rail: without a ranking it shows none.
    return []
  }
}

export async function getShort(locale: Locale, slug: string): Promise<PublishedShort | undefined> {
  const list = await get<List<PublishedShort>>('shorts', {
    locale,
    depth: SHORT_DEPTH,
    limit: 1,
    'where[slug][equals]': slug,
    'where[status][equals]': 'published',
  })
  return list.docs[0]
}

/**
 * A short's sources with their licenses. Relationships inside a join field are not populated,
 * so the short page asks for its sources directly.
 */
export async function listSources(shortId: number): Promise<Source[]> {
  const list = await get<List<Source>>('sources', {
    depth: 1,
    limit: 20,
    'where[short][equals]': shortId,
  })
  return list.docs
}

export async function getPerson(slug: string): Promise<Person | undefined> {
  const list = await get<List<Person>>('people', {
    depth: 0,
    limit: 1,
    'where[slug][equals]': slug,
  })
  return list.docs[0]
}

/** The published shorts that credit a person, in any role. */
export async function listShortsByPerson(
  locale: Locale,
  personId: number,
): Promise<PublishedShort[]> {
  const list = await get<List<PublishedShort>>('shorts', {
    locale,
    depth: SHORT_DEPTH,
    limit: 100,
    sort: '-year',
    'where[credits.person][equals]': personId,
    'where[status][equals]': 'published',
  })
  return list.docs
}

export async function listCollections(locale: Locale): Promise<Collection[]> {
  const list = await get<List<Collection>>('collections', {
    locale,
    depth: 2,
    limit: 50,
    sort: '-featured',
    'where[status][equals]': 'published',
  })
  return list.docs
}

export async function getCollection(locale: Locale, slug: string): Promise<Collection | undefined> {
  const list = await get<List<Collection>>('collections', {
    locale,
    depth: 2,
    limit: 1,
    'where[slug][equals]': slug,
    'where[status][equals]': 'published',
  })
  return list.docs[0]
}

export async function getShowcase(locale: Locale, slug: string): Promise<Showcase | undefined> {
  const list = await get<List<Showcase>>('showcases', {
    locale,
    depth: 2,
    limit: 1,
    'where[slug][equals]': slug,
    'where[status][equals]': 'published',
  })
  return list.docs[0]
}

export async function listShowcases(locale: Locale): Promise<Showcase[]> {
  const list = await get<List<Showcase>>('showcases', {
    locale,
    depth: 0,
    limit: 100,
    'where[status][equals]': 'published',
  })
  return list.docs
}

/** Every published short and person, for the sitemap: slugs and dates only. */
export async function listSitemapDocs(locale: Locale) {
  const [shorts, collections] = await Promise.all([
    get<List<Pick<Short, 'slug' | 'updatedAt' | 'credits'>>>('shorts', {
      locale,
      depth: 1,
      limit: 1000,
      'where[status][equals]': 'published',
      'select[slug]': 'true',
      'select[updatedAt]': 'true',
      'select[credits]': 'true',
    }),
    get<List<Pick<Collection, 'slug' | 'updatedAt'>>>('collections', {
      locale,
      depth: 0,
      limit: 200,
      'where[status][equals]': 'published',
      'select[slug]': 'true',
      'select[updatedAt]': 'true',
    }),
  ])
  const people = new Map<string, string>()
  for (const short of shorts.docs)
    for (const credit of short.credits ?? [])
      if (isObject<Person>(credit.person)) people.set(credit.person.slug, credit.person.updatedAt)
  return { shorts: shorts.docs, collections: collections.docs, people }
}

const isObject = <T>(value: number | T | null | undefined): value is T =>
  typeof value === 'object' && value !== null

export function sourcesOf(short: Short): Source[] {
  return (short.sources?.docs ?? []).filter(isObject<Source>)
}

export function licenseOf(source: Source): License | undefined {
  return isObject<License>(source.license) ? source.license : undefined
}

/** The people credited on a short, in a role or in any, with their page's slug. */
export function creditsOf(short: Short, role?: string): Person[] {
  return (short.credits ?? [])
    .filter((credit) => !role || credit.role === role)
    .map((credit) => credit.person)
    .filter(isObject<Person>)
}

/** The roles a person has on a short. */
export function rolesOf(short: Short, personId: number): string[] {
  return (short.credits ?? [])
    .filter(
      (credit) => (isObject<Person>(credit.person) ? credit.person.id : credit.person) === personId,
    )
    .map((credit) => credit.role)
}

export function peopleOf(short: Short, role?: string): string[] {
  return (short.credits ?? [])
    .filter((credit) => !role || credit.role === role)
    .map((credit) => credit.person)
    .filter(isObject<Person>)
    .map((person) => person.name)
}

export function shortsOf(collection: { shorts?: (number | Short)[] | null }): PublishedShort[] {
  return (collection.shorts ?? [])
    .filter(isObject<Short>)
    .filter((s): s is PublishedShort => s.status === 'published')
}

/** The organization's logo, when it has one. */
export function logoOf(showcase: Showcase): Media | undefined {
  return isObject<Media>(showcase.logo) ? showcase.logo : undefined
}

/**
 * The short's still as an absolute URL on the CMS origin (the hero size when it has one), or
 * undefined when it has none. Visitors never load images from YouTube or Vimeo.
 */
export function stillUrlOf(short: Short): string | undefined {
  if (!isObject<Still>(short.still)) return undefined
  const path = short.still.sizes?.hero?.url ?? short.still.url
  return path ? new URL(path, CMS_PUBLIC_URL || CMS_URL).toString() : undefined
}

/** The short's still at card size (640w) as an absolute URL, or undefined when it has none. */
export function stillCardUrlOf(short: Short): string | undefined {
  if (!isObject<Still>(short.still)) return undefined
  return cmsUrl(short.still.sizes?.card?.url ?? short.still.url)
}

/** A path served by the CMS (media) as an absolute URL. */
export function cmsUrl(path: string | null | undefined): string | undefined {
  return path ? new URL(path, CMS_PUBLIC_URL || CMS_URL).toString() : undefined
}

export function presenterOf(showcase: Showcase): Sponsor | undefined {
  return isObject<Sponsor>(showcase.presentedBy) ? showcase.presentedBy : undefined
}

export function sponsorOf(collection: Collection, now = new Date()): Sponsor | undefined {
  if (!isObject<Sponsor>(collection.sponsor)) return undefined
  const starts = collection.sponsorshipStartsAt
    ? new Date(collection.sponsorshipStartsAt)
    : undefined
  const ends = collection.sponsorshipEndsAt ? new Date(collection.sponsorshipEndsAt) : undefined
  if ((starts && now < starts) || (ends && now > ends)) return undefined
  return collection.sponsor
}

/** The source a short plays from: the first embeddable one that the checker has not flagged. */
export function playableSource(sources: Source[]): Source | undefined {
  return sources.find(
    (source) =>
      source.embeddable &&
      !source.ageRestricted &&
      source.status !== 'broken' &&
      source.status !== 'private',
  )
}

export function toCardSource(short: PublishedShort): CardSource {
  return {
    slug: short.slug,
    title: short.title,
    synopsis: short.synopsis,
    directors: peopleOf(short, 'director'),
    year: short.year,
    durationSeconds: short.durationSeconds,
    posterTone: short.posterTone,
    still: stillCardUrlOf(short),
    type: short.type,
    noDialogue: short.noDialogue,
    brandedContent: short.brandedContent,
    // By primary language, as in the search index: «es-ES» counts as Spanish.
    subtitles: [
      ...new Set(
        sourcesOf(short)
          .flatMap((source) => source.subtitles ?? [])
          .map((code) => code.split('-')[0]?.toLowerCase() ?? code),
      ),
    ],
    publishedAt: short.publishedAt,
  }
}
