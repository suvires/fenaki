import type { Collection, License, Person, Short, Source, Sponsor } from '@shortix/cms/types'
import type { Locale } from '@shortix/i18n'
import { CMS_URL } from 'astro:env/server'
import type { CardSource } from './catalog.ts'

/** Reads the catalog through Payload's REST API. Only published documents are visible here. */
async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`/api/${path}`, CMS_URL)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`CMS ${response.status} for ${url.pathname}${url.search}`)
  return (await response.json()) as T
}

interface List<T> {
  docs: T[]
  totalDocs: number
}

/** Populates credits (people) and the join field of sources. */
const SHORT_DEPTH = 1

export async function listShorts(locale: Locale, limit = 100): Promise<Short[]> {
  const list = await get<List<Short>>('shorts', {
    locale,
    depth: SHORT_DEPTH,
    limit,
    sort: '-publishedAt',
    'where[status][equals]': 'published',
  })
  return list.docs
}

export async function getShort(locale: Locale, slug: string): Promise<Short | undefined> {
  const list = await get<List<Short>>('shorts', {
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

const isObject = <T>(value: number | T | null | undefined): value is T =>
  typeof value === 'object' && value !== null

export function sourcesOf(short: Short): Source[] {
  return (short.sources?.docs ?? []).filter(isObject<Source>)
}

export function licenseOf(source: Source): License | undefined {
  return isObject<License>(source.license) ? source.license : undefined
}

export function peopleOf(short: Short, role?: string): string[] {
  return (short.credits ?? [])
    .filter((credit) => !role || credit.role === role)
    .map((credit) => credit.person)
    .filter(isObject<Person>)
    .map((person) => person.name)
}

export function shortsOf(collection: Collection): Short[] {
  return (collection.shorts ?? []).filter(isObject<Short>).filter((s) => s.status === 'published')
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
    (source) => source.embeddable && source.status !== 'broken' && source.status !== 'private',
  )
}

export function toCardSource(short: Short): CardSource {
  return {
    slug: short.slug,
    title: short.title,
    directors: peopleOf(short, 'director'),
    year: short.year,
    durationSeconds: short.durationSeconds,
    posterTone: short.posterTone,
    type: short.type,
    noDialogue: short.noDialogue,
    brandedContent: short.brandedContent,
    subtitles: [...new Set(sourcesOf(short).flatMap((source) => source.subtitles ?? []))],
    publishedAt: short.publishedAt,
  }
}
