import type { Locale } from '@shortix/i18n'
import { MEILISEARCH_HOST } from 'astro:env/server'
import { getSecret, SEARCH_INDEX_PREFIX } from 'astro:env/server'
import { Meilisearch } from 'meilisearch'
import { browseQueries, mergeFacets, PAGE_SIZE, type FacetCounts, type Filters } from './browse.ts'
import type { CardSource } from './catalog.ts'

/** A hit from the per-locale shorts index (see apps/cms/src/search/document.ts). */
export interface ShortHit {
  id: number
  slug: string
  title: string
  directors: string[]
  year: number | null
  durationSeconds: number
  posterTone: string
  type: string
  noDialogue: boolean
  brandedContent?: boolean
  subtitles: string[]
  publishedAt: number | null
}

export interface SearchResult {
  query: string
  hits: CardSource[]
  total: number
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

export async function searchShorts(locale: Locale, query: string): Promise<SearchResult> {
  const response = await meili().index<ShortHit>(indexName(locale)).search(query, { limit: 48 })
  return {
    query,
    total: response.estimatedTotalHits ?? response.hits.length,
    hits: response.hits.map(toCardSource),
  }
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
    directors: hit.directors,
    year: hit.year,
    durationSeconds: hit.durationSeconds,
    posterTone: hit.posterTone,
    type: hit.type,
    noDialogue: hit.noDialogue,
    brandedContent: hit.brandedContent,
    subtitles: hit.subtitles,
    publishedAt: hit.publishedAt,
  }
}
