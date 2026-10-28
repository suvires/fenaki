/**
 * A collection by filters, resolved: its rules become a search over the published catalog (the
 * Meilisearch index of a locale), with the pinned shorts first and the excluded ones left out.
 * One place for this, used by the site (`GET /api/collections/:id/shorts`) and by the preview in
 * the admin panel.
 */
import { searchClient } from '../search/client.ts'
import { shortsIndexName } from '../search/document.ts'
import { REGION_COUNTRIES } from '@fenaki/i18n'

export interface CollectionRules {
  types?: string[] | null
  genres?: string[] | null
  themes?: string[] | null
  region?: keyof typeof REGION_COUNTRIES | null
  countries?: string[] | null
  channelKinds?: string[] | null
  minMinutes?: number | null
  maxMinutes?: number | null
  yearFrom?: number | null
  yearTo?: number | null
  originalLanguage?: string | null
  spanishSubtitles?: boolean | null
  noDialogue?: boolean | null
  allAudiences?: boolean | null
  withAwards?: boolean | null
}

export type CollectionSort = 'newest' | 'year' | 'daily'

const list = (values: (string | number)[]) => `[${values.map((v) => JSON.stringify(v)).join(', ')}]`
const some = (values: string[] | null | undefined) => (values ?? []).filter(Boolean)

/** The Meilisearch filter of the rules: every rule set, ANDed; empty rules are left out. */
export function rulesFilter(rules: CollectionRules | null | undefined): string[] {
  if (!rules) return []
  const filters: string[] = []
  const types = some(rules.types)
  if (types.length > 0) filters.push(`type IN ${list(types)}`)
  const genres = some(rules.genres)
  if (genres.length > 0) filters.push(`genres IN ${list(genres)}`)
  const themes = some(rules.themes)
  if (themes.length > 0) filters.push(`themes IN ${list(themes)}`)
  const countries = [
    ...new Set([
      ...(rules.region ? REGION_COUNTRIES[rules.region] : []),
      ...some(rules.countries).map((code) => code.trim().toUpperCase()),
    ]),
  ].filter((code) => /^[A-Z]{2}$/.test(code))
  if (countries.length > 0) filters.push(`country IN ${list(countries)}`)
  const kinds = some(rules.channelKinds)
  if (kinds.length > 0) filters.push(`channelKind IN ${list(kinds)}`)
  if (rules.minMinutes != null)
    filters.push(`durationSeconds >= ${Math.round(rules.minMinutes * 60)}`)
  if (rules.maxMinutes != null)
    filters.push(`durationSeconds <= ${Math.round(rules.maxMinutes * 60)}`)
  if (rules.yearFrom != null) filters.push(`year >= ${Math.round(rules.yearFrom)}`)
  if (rules.yearTo != null) filters.push(`year <= ${Math.round(rules.yearTo)}`)
  const language = rules.originalLanguage?.trim().toLowerCase()
  if (language && /^[a-z]{2,3}$/.test(language))
    filters.push(`originalLanguage = ${JSON.stringify(language)}`)
  if (rules.spanishSubtitles) filters.push('subtitles = "es"')
  if (rules.noDialogue) filters.push('noDialogue = true')
  if (rules.allAudiences) filters.push('audience = "all"')
  if (rules.withAwards) filters.push('hasAwards = true')
  return filters
}

/** The Meilisearch sort of each order; `daily` is shuffled here instead (see `dailyOrder`). */
const SORTS: Record<CollectionSort, string[]> = {
  newest: ['publishedAt:desc'],
  year: ['year:desc', 'publishedAt:desc'],
  daily: ['publishedAt:desc'],
}

/** At most this many matches are shuffled for the daily mix. */
const DAILY_POOL = 1000

/** The day (UTC) as a number: the daily mix changes once a day, the same for everyone. */
const today = (now: Date) => Math.floor(now.getTime() / 86_400_000)

/** A stable order for this day: ids sorted by a hash of the id and the day. */
export function dailyOrder(ids: number[], now = new Date()): number[] {
  const day = today(now)
  const hash = (id: number) => Math.imul(id ^ 0x9e3779b9, day ^ 0x85ebca6b) >>> 0
  return [...ids].sort((a, b) => hash(a) - hash(b) || a - b)
}

export interface ResolveOptions {
  locale: string
  rules: CollectionRules | null | undefined
  sort: CollectionSort
  pinned?: number[]
  excluded?: number[]
  offset?: number
  limit: number
  now?: Date
}

/**
 * The ids of a page of the collection, and how many shorts it has: the pinned ones that are
 * published, in their order, then the matches (never a pinned or excluded short again).
 */
export async function resolveCollection(
  options: ResolveOptions,
): Promise<{ ids: number[]; total: number }> {
  const { locale, rules, sort, limit, now = new Date() } = options
  const offset = Math.max(0, options.offset ?? 0)
  const index = searchClient().index<{ id: number }>(shortsIndexName(locale))
  const pinnedAsked = [...new Set(options.pinned ?? [])]
  const excluded = [...new Set(options.excluded ?? [])]

  // The pinned shorts that are published (in the index), in the editor's order.
  const pinned =
    pinnedAsked.length === 0
      ? []
      : await index
          .search('', {
            filter: [`id IN ${list(pinnedAsked)}`],
            limit: pinnedAsked.length,
            attributesToRetrieve: ['id'],
          })
          .then((found) => {
            const present = new Set(found.hits.map((hit) => hit.id))
            return pinnedAsked.filter((id) => present.has(id))
          })

  const filter = [...rulesFilter(rules)]
  const leftOut = [...pinned, ...excluded]
  if (leftOut.length > 0) filter.push(`id NOT IN ${list(leftOut)}`)

  // Where the matches start on this page, once the pinned ones are counted.
  const fromPinned = pinned.slice(offset, offset + limit)
  const matchOffset = Math.max(0, offset - pinned.length)
  const matchLimit = limit - fromPinned.length

  if (sort === 'daily') {
    const all = await index.search('', {
      filter,
      limit: DAILY_POOL,
      sort: SORTS.newest,
      attributesToRetrieve: ['id'],
    })
    const mixed = dailyOrder(
      all.hits.map((hit) => hit.id),
      now,
    )
    return {
      ids: [...fromPinned, ...mixed.slice(matchOffset, matchOffset + matchLimit)],
      total: pinned.length + mixed.length,
    }
  }

  // Two searches: this page's matches, and the exact count (an offset search only estimates it).
  const [matches, count] = await Promise.all([
    index.search('', {
      filter,
      offset: matchOffset,
      limit: Math.max(0, matchLimit),
      sort: SORTS[sort],
      attributesToRetrieve: ['id'],
    }),
    index.search('', { filter, page: 1, hitsPerPage: 0 }),
  ])
  return {
    ids: [...fromPinned, ...matches.hits.map((hit) => hit.id)],
    total: pinned.length + (count.totalHits ?? matches.hits.length),
  }
}
