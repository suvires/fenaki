import type { Locale } from '@fenaki/i18n'
import { MEILISEARCH_HOST } from 'astro:env/server'
import { getSecret, SEARCH_INDEX_PREFIX } from 'astro:env/server'
import { Meilisearch } from 'meilisearch'
import { browseQueries, mergeFacets, PAGE_SIZE, type FacetCounts, type Filters } from './browse.ts'
import { cmsUrl } from './cms.ts'
import type { CardSource } from './catalog.ts'

/** A hit from the per-locale shorts index (see apps/cms/src/search/document.ts). */
export interface ShortHit {
  id: number
  slug: string
  title: string
  synopsis?: string
  directors: string[]
  year: number | null
  durationSeconds: number
  posterTone: string
  still?: string | null
  stillTextColor?: 'light' | 'dark' | null
  stillIncludesTitle?: boolean
  type: string
  noDialogue: boolean
  brandedContent?: boolean
  /** `all` when it suits every audience. */
  audience?: 'all' | null
  subtitles: string[]
  publishedAt: number | null
}

export interface SearchResult {
  query: string
  hits: CardSource[]
  total: number
  /** This page, from 1, and how many there are (20 shorts a page, as every paged list). */
  page: number
  pages: number
}

let client: Meilisearch | undefined

function meili(): Meilisearch {
  client ??= new Meilisearch({
    host: MEILISEARCH_HOST,
    apiKey: getSecret('MEILISEARCH_SEARCH_KEY'),
  })
  return client
}

const indexName = (locale: Locale) => `${SEARCH_INDEX_PREFIX}shorts_${locale}`

export async function searchShorts(locale: Locale, query: string, page = 1): Promise<SearchResult> {
  // Asking by page makes Meilisearch count every match exactly, so the pager knows its end.
  const response = await meili()
    .index<ShortHit>(indexName(locale))
    .search(query, { page, hitsPerPage: PAGE_SIZE })
  const total = response.totalHits ?? response.hits.length
  return {
    query,
    total,
    hits: response.hits.map(toCardSource),
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

/** These shorts' cards, in the order of the ids given; the ones not in the index are left out. */
export async function cardsByIds(locale: Locale, ids: number[]): Promise<CardSource[]> {
  if (ids.length === 0) return []
  const response = await meili()
    .index<ShortHit>(indexName(locale))
    .search('', { filter: [`id IN [${ids.join(', ')}]`], limit: ids.length })
  const byId = new Map(response.hits.map((hit) => [hit.id, toCardSource(hit)]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

export interface BrowseResult {
  hits: CardSource[]
  total: number
  pages: number
  /** Counts per index attribute and value, given the other active filters. */
  facets: FacetCounts
}

/** One page of the browse page, with the facet counts, in a single multi-search request. */
export async function browseShorts(
  locale: Locale,
  filters: Filters,
  page: number,
): Promise<BrowseResult> {
  const { results } = await meili().multiSearch({
    queries: browseQueries(indexName(locale), filters, page),
  })
  const [main, ...others] = results
  const total = main?.totalHits ?? main?.estimatedTotalHits ?? 0
  return {
    hits: ((main?.hits ?? []) as ShortHit[]).map(toCardSource),
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    facets: mergeFacets(
      filters,
      main?.facetDistribution,
      others.map((result) => result.facetDistribution),
    ),
  }
}

function toCardSource(hit: ShortHit): CardSource {
  return {
    slug: hit.slug,
    title: hit.title,
    synopsis: hit.synopsis,
    directors: hit.directors,
    year: hit.year,
    durationSeconds: hit.durationSeconds,
    posterTone: hit.posterTone,
    still: cmsUrl(hit.still),
    stillTextColor: hit.stillTextColor,
    stillIncludesTitle: hit.stillIncludesTitle,
    type: hit.type,
    noDialogue: hit.noDialogue,
    brandedContent: hit.brandedContent,
    allAudiences: hit.audience === 'all',
    subtitles: hit.subtitles,
    publishedAt: hit.publishedAt,
  }
}
