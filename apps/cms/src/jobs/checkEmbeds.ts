import type { PayloadRequest, TaskConfig } from 'payload'
import type { Short, Source } from '../payload-types.ts'
import { assess, hideReason, unplayableReason, type Assessment } from '../ingest/check.ts'
import { ingestKeys } from '../ingest/metadata.ts'
import { fetchOEmbed, type Fetch } from '../ingest/oembed.ts'
import { videoPageUrl } from '../ingest/url.ts'
import { fetchYouTubeVideos, type YouTubeVideo } from '../ingest/youtube.ts'
import type { HiddenReason } from '../collections/Shorts.ts'

/** Pause between oEmbed requests: the check runs at night and is in no hurry. */
const PAUSE_MS = 300

const shortIdOf = (source: Source) =>
  typeof source.short === 'object' ? source.short.id : source.short

export interface CheckSummary {
  checked: number
  problems: number
  inconclusive: number
  hidden: number
}

/**
 * Checks every source of the published shorts (and of the ones the checker hid, to report when
 * they play again) and hides the shorts that can no longer play. Metadata is stored in the
 * database: pages never ask the providers.
 */
export async function checkEmbeds(
  req: PayloadRequest,
  fetchFn: Fetch = fetch,
  pauseMs = PAUSE_MS,
): Promise<CheckSummary> {
  const { payload } = req
  const shorts = await payload.find({
    collection: 'shorts',
    where: {
      or: [{ status: { equals: 'published' } }, { hiddenReason: { exists: true } }],
    },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const byId = new Map<number, Short>(shorts.docs.map((short) => [short.id, short]))
  const sources = await payload.find({
    collection: 'sources',
    where: { short: { in: [...byId.keys()] }, provider: { in: ['youtube', 'vimeo'] } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })

  // One YouTube Data API request per 50 videos, when there is a key.
  const keys = ingestKeys()
  let api: Map<string, YouTubeVideo> | undefined
  const youtubeIds = sources.docs.filter((s) => s.provider === 'youtube').map((s) => s.externalId)
  if (keys.youtube && youtubeIds.length > 0) {
    try {
      api = await fetchYouTubeVideos(youtubeIds, keys.youtube, fetchFn)
    } catch (error) {
      payload.logger.warn(`checkEmbeds: ${(error as Error).message}; using oEmbed only`)
    }
  }

  const summary: CheckSummary = { checked: 0, problems: 0, inconclusive: 0, hidden: 0 }
  const results = new Map<number, { assessment: Assessment; reason?: HiddenReason }[]>()
  const now = new Date().toISOString()

  for (const source of sources.docs) {
    const url = source.url || videoPageUrl(source.provider, source.externalId)
    if (!url) continue
    const oembed = await fetchOEmbed(
      { provider: source.provider as 'youtube' | 'vimeo', url },
      fetchFn,
    )
    const apiVideo =
      api && source.provider === 'youtube' ? (api.get(source.externalId) ?? null) : undefined
    const assessment = assess(oembed, apiVideo)
    const reason = unplayableReason(assessment)
    summary.checked += 1
    if (!assessment.conclusive) summary.inconclusive += 1
    if (reason) summary.problems += 1

    const shortId = shortIdOf(source)
    results.set(shortId, [...(results.get(shortId) ?? []), { assessment, reason }])

    await payload.update({
      collection: 'sources',
      id: source.id,
      data: assessment.conclusive
        ? {
            status: assessment.status,
            embeddable: assessment.embeddable,
            ageRestricted: assessment.ageRestricted,
            lastCheckedAt: now,
            problemSince: reason ? (source.problemSince ?? now) : null,
            checkNote: assessment.note,
          }
        : { checkNote: assessment.note },
      req,
    })
    if (pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, pauseMs))
  }

  for (const [shortId, checks] of results) {
    const short = byId.get(shortId)
    const reason = hideReason(checks)
    if (!short || short.status !== 'published' || !reason) continue
    await payload.update({
      collection: 'shorts',
      id: shortId,
      data: { status: 'withdrawn', hiddenReason: reason, hiddenAt: now },
      req,
    })
    summary.hidden += 1
    payload.logger.warn(`checkEmbeds: hid «${short.title}» (${reason})`)
  }
  return summary
}

/** Nightly, in the jobs worker. Editors can also queue it from the embed problems view. */
export const checkEmbedsTask: TaskConfig<{
  input: Record<string, never>
  output: CheckSummary
}> = {
  slug: 'checkEmbeds',
  label: 'Check embeds',
  retries: 1,
  outputSchema: [
    { name: 'checked', type: 'number', required: true },
    { name: 'problems', type: 'number', required: true },
    { name: 'inconclusive', type: 'number', required: true },
    { name: 'hidden', type: 'number', required: true },
  ],
  schedule: [{ cron: '0 0 3 * * *', queue: 'default' }],
  handler: async ({ req }) => {
    const output = await checkEmbeds(req)
    req.payload.logger.info(
      `checkEmbeds: ${output.checked} sources checked, ${output.problems} problems, ${output.inconclusive} inconclusive, ${output.hidden} shorts hidden`,
    )
    return { output }
  },
}
