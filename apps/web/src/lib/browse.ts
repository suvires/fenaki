/**
 * The browse page's filters: how they read from and write to the URL, and how they become
 * Meilisearch filters. No Astro imports, so tests can use it.
 */
import { PAGE_SIZE } from './paging.ts'

/** URL parameter → index attribute. The parameter names are the same in every locale. */
export const FILTERS = {
  duration: 'durationBand',
  lang: 'originalLanguage',
  subs: 'subtitles',
  form: 'form',
  type: 'type',
  genre: 'genres',
  theme: 'themes',
  audience: 'audience',
  country: 'country',
} as const

export type FilterKey = keyof typeof FILTERS
export type Filters = Partial<Record<FilterKey, string>>

export const FILTER_KEYS = Object.keys(FILTERS) as FilterKey[]

const VALID: Record<FilterKey, RegExp> = {
  duration: /^(short|mid|long)$/,
  lang: /^[a-z]{2,3}$/,
  subs: /^[a-z]{2,3}$/,
  form: /^(animation|live-action)$/,
  type: /^(fiction|documentary|animation|experimental)$/,
  genre:
    /^(drama|comedy|horror|thriller|science-fiction|fantasy|romance|action-adventure|musical-dance)$/,
  theme: /^(society|lgbtiq|family|memory-history|nature-environment|sport)$/,
  audience: /^all$/,
  country: /^[A-Z]{2}$/,
}

/** Shorts a page: the same 20 as every paged list (lib/paging.ts). */
export { PAGE_SIZE }

/** The filters and page in a URL. Unknown or malformed values are ignored, never passed on. */
export function parseBrowseParams(params: URLSearchParams): { filters: Filters; page: number } {
  const filters: Filters = {}
  for (const key of FILTER_KEYS) {
    const value = params.get(key)
    if (value && VALID[key].test(value)) filters[key] = value
  }
  const page = Number(params.get('page'))
  return { filters, page: Number.isInteger(page) && page > 1 && page < 1000 ? page : 1 }
}

export const hasFilters = (filters: Filters) => FILTER_KEYS.some((key) => filters[key])

/**
 * The URL of the browse page with these filters and page. Parameters always come in the same
 * order, so one combination has one URL.
 */
export function browseHref(base: string, filters: Filters, page = 1): string {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

/** The page with one filter toggled: set to this value, or cleared when it already has it. */
export function toggleHref(base: string, filters: Filters, key: FilterKey, value: string) {
  return browseHref(base, { ...filters, [key]: filters[key] === value ? undefined : value })
}

/** Meilisearch filter expressions, all of them ANDed; `except` leaves one out for its counts. */
export function meiliFilter(filters: Filters, except?: FilterKey): string[] {
  return FILTER_KEYS.filter((key) => key !== except && filters[key]).map(
    (key) => `${FILTERS[key]} = ${JSON.stringify(filters[key])}`,
  )
}

export interface FacetCounts {
  [attribute: string]: Record<string, number>
}

/**
 * The searches one browse page needs, in one multi-search request: the results with every
 * filter, then, for each active filter, its counts without it (so the other options of that
 * filter show what choosing them would give).
 */
export function browseQueries(indexUid: string, filters: Filters, page: number) {
  const facets = Object.values(FILTERS)
  const active = FILTER_KEYS.filter((key) => filters[key])
  return [
    {
      indexUid,
      q: '',
      filter: meiliFilter(filters),
      facets,
      sort: ['publishedAt:desc'],
      page,
      hitsPerPage: PAGE_SIZE,
    },
    ...active.map((key) => ({
      indexUid,
      q: '',
      filter: meiliFilter(filters, key),
      facets: [FILTERS[key]],
      limit: 0,
    })),
  ]
}

/** Merges the counts: each active filter's own counts come from the search without it. */
export function mergeFacets(
  filters: Filters,
  main: FacetCounts | undefined,
  others: (FacetCounts | undefined)[],
): FacetCounts {
  const merged: FacetCounts = { ...main }
  FILTER_KEYS.filter((key) => filters[key]).forEach((key, index) => {
    const attribute = FILTERS[key]
    merged[attribute] = others[index]?.[attribute] ?? {}
  })
  return merged
}
