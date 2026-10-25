import type { PayloadRequest, TaskConfig } from 'payload'
import type { Short } from '../payload-types.ts'
import type { Fetch } from '../ingest/oembed.ts'
import { fetchPlays, umamiConfig, type UmamiConfig } from '../ranking/umami.ts'

/** The rail shows exactly this many; the site hides it until the ranking has them all. */
export const RANKING_SIZE = 10
export const RANKING_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export interface RankableShort {
  id: number
  /** Every slug the short has (one per locale): the play event carries the page's own. */
  slugs: string[]
  publishedAt?: string | null
}

/**
 * The ids of the most played shorts, most played first. Shorts nobody played are left out, ties go
 * to the most recently published, and plays of slugs that are not in `shorts` (unpublished or
 * deleted) are ignored.
 */
export function rankShorts(
  plays: Map<string, number>,
  shorts: RankableShort[],
  size = RANKING_SIZE,
): number[] {
  return shorts
    .map((short) => ({
      short,
      plays: short.slugs.reduce((sum, slug) => sum + (plays.get(slug) ?? 0), 0),
      publishedAt: short.publishedAt ? Date.parse(short.publishedAt) : 0,
    }))
    .filter((entry) => entry.plays > 0)
    .sort((a, b) => b.plays - a.plays || b.publishedAt - a.publishedAt || b.short.id - a.short.id)
    .slice(0, size)
    .map((entry) => entry.short.id)
}

/** Slug is localized: with `locale: 'all'` it is one value per locale. */
const slugsOf = (slug: Short['slug'] | Record<string, string> | undefined): string[] => {
  if (!slug) return []
  return typeof slug === 'string' ? [slug] : Object.values(slug).filter(Boolean)
}

export interface RankingSummary {
  skipped: boolean
  ranked: number
}

/**
 * Stores the ten most played published shorts of the last seven days in the `ranking` global.
 * Plays come from Umami; if it fails the error propagates and the stored ranking stays as it was.
 * Without Umami configured nothing is written.
 */
export async function computeRanking(
  req: PayloadRequest,
  fetchFn: Fetch = fetch,
  now = new Date(),
  config: UmamiConfig | null = umamiConfig() ?? null,
): Promise<RankingSummary> {
  if (!config) return { skipped: true, ranked: 0 }
  const { payload } = req

  const windowEnd = now.getTime()
  const windowStart = windowEnd - RANKING_DAYS * DAY_MS
  const plays = await fetchPlays(config, { startAt: windowStart, endAt: windowEnd }, fetchFn)

  const published = await payload.find({
    collection: 'shorts',
    where: { status: { equals: 'published' } },
    locale: 'all',
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const ids = rankShorts(
    plays,
    published.docs.map((short) => ({
      id: short.id,
      slugs: slugsOf(short.slug as Short['slug'] | Record<string, string>),
      publishedAt: short.publishedAt,
    })),
  )

  await payload.updateGlobal({
    slug: 'ranking',
    data: {
      shorts: ids,
      computedAt: now.toISOString(),
      windowStart: new Date(windowStart).toISOString(),
      windowEnd: now.toISOString(),
    },
    req,
  })
  return { skipped: false, ranked: ids.length }
}

/** Nightly, in the jobs worker, after the embed check has hidden what no longer plays. */
export const computeRankingTask: TaskConfig<{
  input: Record<string, never>
  output: RankingSummary
}> = {
  slug: 'computeRanking',
  label: 'Compute the Top 10',
  retries: 1,
  outputSchema: [
    { name: 'skipped', type: 'checkbox', required: true },
    { name: 'ranked', type: 'number', required: true },
  ],
  schedule: [{ cron: '0 0 4 * * *', queue: 'default' }],
  handler: async ({ req }) => {
    const output = await computeRanking(req)
    req.payload.logger.info(
      output.skipped
        ? 'computeRanking: Umami is not configured, ranking left as it was'
        : `computeRanking: ${output.ranked} shorts ranked`,
    )
    return { output }
  },
}
