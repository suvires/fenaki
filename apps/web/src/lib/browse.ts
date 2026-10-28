/**
 * The browse page's filters: how they read from and write to the URL, and how they become
 * Meilisearch filters. No Astro imports, so tests can use it.
 */
import { REGION_COUNTRIES, REGIONS, type Region } from '@fenaki/i18n'
import { PAGE_SIZE } from './paging.ts'

export const GENRES = [
  'drama',
  'comedy',
  'horror',
  'thriller',
  'science-fiction',
  'fantasy',
  'romance',
  'action-adventure',
  'musical-dance',
] as const
export const THEMES = [
  'society',
  'lgbtiq',
  'family',
  'memory-history',
  'nature-environment',
  'sport',
] as const
export type Theme = (typeof THEMES)[number]
export const TYPES = ['fiction', 'documentary', 'animation', 'experimental'] as const
export const DURATIONS = ['short', 'mid', 'long'] as const
export const CHANNEL_KINDS = [
  'author',
  'producer',
  'distributor',
  'festival',
  'school',
  'institution',
] as const

const oneOf = (values: readonly string[]) => new RegExp(`^(${values.join('|')})$`)

interface FilterDef {
  /** The index attribute whose facet gives the counts. */
  attribute: string
  valid: RegExp
  /** On or off (`?awards=1`): one value, `1`, matched by `attribute = true`. */
  toggle?: boolean
  /** The Meilisearch expression for these values; `attribute IN [...]` when left out. */
  expr?: (values: string[]) => string
  /** The counts per value from the attribute's facet; the facet itself when left out. */
  counts?: (facet: Record<string, number>) => Record<string, number>
}

const decadeStart = (year: string) => String(Math.floor(Number(year) / 10) * 10)

/**
 * URL parameter → how it filters, in the order of the URL and of the filter bar. The parameter
 * names are the same in every locale. Within a filter the values are ORed, filters are ANDed.
 */
export const FILTERS = {
  genre: { attribute: 'genres', valid: oneOf(GENRES) },
  theme: { attribute: 'themes', valid: oneOf(THEMES) },
  duration: { attribute: 'durationBand', valid: oneOf(DURATIONS) },
  type: { attribute: 'type', valid: oneOf(TYPES) },
  lang: { attribute: 'originalLanguage', valid: /^[a-z]{2,3}$/ },
  region: {
    attribute: 'country',
    valid: oneOf(REGIONS),
    expr: (values) =>
      `country IN ${JSON.stringify([...new Set(values.flatMap((r) => REGION_COUNTRIES[r as Region]))])}`,
    counts: (facet) =>
      Object.fromEntries(
        REGIONS.map((region) => [
          region,
          REGION_COUNTRIES[region].reduce((sum, country) => sum + (facet[country] ?? 0), 0),
        ]),
      ),
  },
  country: { attribute: 'country', valid: /^[A-Z]{2}$/ },
  decade: {
    attribute: 'year',
    valid: /^(18|19|20)\d0$/,
    expr: (values) =>
      `(${values.map((start) => `year ${start} TO ${Number(start) + 9}`).join(' OR ')})`,
    counts: (facet) => {
      const decades: Record<string, number> = {}
      for (const [year, count] of Object.entries(facet)) {
        decades[decadeStart(year)] = (decades[decadeStart(year)] ?? 0) + count
      }
      return decades
    },
  },
  channel: { attribute: 'channelKind', valid: oneOf(CHANNEL_KINDS) },
  subs: { attribute: 'subtitles', valid: /^[a-z]{2,3}$/ },
  nodialogue: { attribute: 'noDialogue', valid: /^1$/, toggle: true },
  audience: { attribute: 'audience', valid: /^all$/ },
  awards: { attribute: 'hasAwards', valid: /^1$/, toggle: true },
} satisfies Record<string, FilterDef>

export type FilterKey = keyof typeof FILTERS
export type Filters = Partial<Record<FilterKey, string[]>>

export const FILTER_KEYS = Object.keys(FILTERS) as FilterKey[]
const def = (key: FilterKey): FilterDef => FILTERS[key]

/** The orders of the browse page; the first is the default and stays out of the URL. */
export const SORTS = {
  newest: ['publishedAt:desc'],
  year: ['year:desc', 'publishedAt:desc'],
  shortest: ['durationSeconds:asc', 'publishedAt:desc'],
} as const
export type SortKey = keyof typeof SORTS
export const SORT_KEYS = Object.keys(SORTS) as SortKey[]

export interface BrowseState {
  filters: Filters
  sort?: SortKey
}

/** Shorts a page: the same 20 as every paged list (lib/paging.ts). */
export { PAGE_SIZE }

/** At most this many values per filter, so a URL cannot build an endless query. */
const MAX_VALUES = 20

/**
 * The filters, order and page in a URL. Values are comma-separated (`?genre=horror,thriller`);
 * unknown or malformed ones are ignored, never passed on.
 */
export function parseBrowseParams(params: URLSearchParams): {
  filters: Filters
  sort: SortKey
  page: number
} {
  const filters: Filters = {}
  for (const key of FILTER_KEYS) {
    const values = (params.get(key) ?? '').split(',').filter((value) => def(key).valid.test(value))
    if (values.length > 0) filters[key] = [...new Set(values)].slice(0, MAX_VALUES)
  }
  const sortParam = params.get('sort')
  const sort = SORT_KEYS.find((key) => key === sortParam) ?? 'newest'
  const page = Number(params.get('page'))
  return {
    filters,
    sort,
    page: Number.isInteger(page) && page > 1 && page < 1000 ? page : 1,
  }
}

export const hasFilters = (filters: Filters) => FILTER_KEYS.some((key) => filters[key]?.length)

/** How many values are chosen across every filter: «Filtros (3)». */
export const filterCount = (filters: Filters) =>
  FILTER_KEYS.reduce((sum, key) => sum + (filters[key]?.length ?? 0), 0)

/**
 * The URL of the browse page with these filters, order and page. Parameters and values always
 * come in the same order, so one combination has one URL.
 */
export function browseHref(base: string, { filters, sort }: BrowseState, page = 1): string {
  const params: string[] = []
  for (const key of FILTER_KEYS) {
    const values = filters[key]
    // Every valid value is URL-safe, so the commas stay readable instead of becoming %2C.
    if (values?.length) params.push(`${key}=${[...values].sort().join(',')}`)
  }
  if (sort && sort !== 'newest') params.push(`sort=${sort}`)
  if (page > 1) params.push(`page=${page}`)
  return params.length ? `${base}?${params.join('&')}` : base
}

/** The page with one value of a filter added, or taken out when it is already chosen. */
export function toggleHref(base: string, state: BrowseState, key: FilterKey, value: string) {
  const current = state.filters[key] ?? []
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  return browseHref(base, { ...state, filters: { ...state.filters, [key]: next } })
}

/** Meilisearch filter expressions, all of them ANDed; `except` leaves one out for its counts. */
export function meiliFilter(filters: Filters, except?: FilterKey): string[] {
  return FILTER_KEYS.filter((key) => key !== except && filters[key]?.length).map((key) => {
    const { attribute, toggle, expr } = def(key)
    const values = filters[key] ?? []
    if (toggle) return `${attribute} = true`
    if (expr) return expr(values)
    return `${attribute} IN ${JSON.stringify(values)}`
  })
}

export interface FacetCounts {
  [attribute: string]: Record<string, number>
}
/** Counts per filter and URL value: what choosing that value would give. */
export type FilterCounts = Partial<Record<FilterKey, Record<string, number>>>

const FACETS = [...new Set(FILTER_KEYS.map((key) => def(key).attribute))]

/**
 * The searches one browse page needs, in one multi-search request: the results with every
 * filter, then, for each active filter, its counts without it (so the other options of that
 * filter show what adding them would give).
 */
export function browseQueries(indexUid: string, { filters, sort }: BrowseState, page: number) {
  const active = FILTER_KEYS.filter((key) => filters[key]?.length)
  return [
    {
      indexUid,
      q: '',
      filter: meiliFilter(filters),
      facets: FACETS,
      sort: [...SORTS[sort ?? 'newest']],
      page,
      hitsPerPage: PAGE_SIZE,
    },
    ...active.map((key) => ({
      indexUid,
      q: '',
      filter: meiliFilter(filters, key),
      facets: [def(key).attribute],
      limit: 0,
    })),
  ]
}

/**
 * The counts of every filter: an active filter's come from the search without it, the others
 * from the main search.
 */
export function filterCounts(
  filters: Filters,
  main: FacetCounts | undefined,
  others: (FacetCounts | undefined)[],
): FilterCounts {
  const active = FILTER_KEYS.filter((key) => filters[key]?.length)
  const counts: FilterCounts = {}
  for (const key of FILTER_KEYS) {
    const { attribute, toggle, counts: aggregate } = def(key)
    const index = active.indexOf(key)
    const facet = (index === -1 ? main : others[index])?.[attribute] ?? {}
    counts[key] = toggle ? { 1: facet.true ?? 0 } : aggregate ? aggregate(facet) : facet
  }
  return counts
}
