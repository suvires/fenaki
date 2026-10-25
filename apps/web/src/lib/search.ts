import type { Locale } from '@shortix/i18n'
import { MEILISEARCH_HOST } from 'astro:env/server'
import { getSecret } from 'astro:env/server'
import { Meilisearch } from 'meilisearch'
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

export async function searchShorts(locale: Locale, query: string): Promise<SearchResult> {
  client ??= new Meilisearch({
    host: MEILISEARCH_HOST,
    apiKey: getSecret('MEILISEARCH_SEARCH_KEY'),
  })
  const response = await client.index<ShortHit>(`shorts_${locale}`).search(query, { limit: 48 })
  return {
    query,
    total: response.estimatedTotalHits ?? response.hits.length,
    hits: response.hits.map((hit) => ({
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
    })),
  }
}
