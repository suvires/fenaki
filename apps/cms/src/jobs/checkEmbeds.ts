import type { PayloadRequest, TaskConfig } from 'payload'
import type { Short, Source, Still } from '../payload-types.ts'
import { assess, hideReason, unplayableReason, type Assessment } from '../ingest/check.ts'
import { ingestKeys } from '../ingest/metadata.ts'
import { fetchOEmbed, type Fetch, type OEmbedResult } from '../ingest/oembed.ts'
import { downloadThumbnail, thumbnailCandidates } from '../ingest/stills.ts'
import { videoPageUrl } from '../ingest/url.ts'
import { fetchYouTubeVideos, type YouTubeVideo } from '../ingest/youtube.ts'
import type { HiddenReason } from '../collections/Shorts.ts'
import { LONG_QUEUE } from './queue.ts'

/** Pause between oEmbed requests: the check runs at night and is in no hurry. */
const PAUSE_MS = 300

/**
 * A source checked this recently is not asked again: a check cut short (a deploy restarts the
 * worker) resumes where it stopped instead of starting over. Shorter than a day, so every night
 * still checks everything once.
 */
export const RECHECK_AFTER_MS = 20 * 60 * 60 * 1000

const shortIdOf = (source: Source) =>
  typeof source.short === 'object' ? source.short.id : source.short

const idOf = (ref: number | { id: number } | null | undefined) =>
  ref && typeof ref === 'object' ? ref.id : (ref ?? undefined)

/** Same rule as the site: embeddable, not age restricted and not flagged by the checker. */
const isPlayable = (source: Pick<Source, 'embeddable' | 'ageRestricted' | 'status'>) =>
  source.embeddable !== false &&
  !source.ageRestricted &&
  source.status !== 'broken' &&
  source.status !== 'private'

export interface CheckSummary {
  checked: number
  /** Checked recently (by this night's run before it was cut short): their stored state counts. */
  skipped: number
  problems: number
  inconclusive: number
  hidden: number
  /** Provider stills downloaded or refreshed. */
  stills: number
}

/**
 * Checks every source of the published shorts (and of the ones the checker hid, to report when
 * they play again) and hides the shorts that can no longer play. Metadata is stored in the
 * database: pages never ask the providers. Also keeps each playable short's provider still
 * fresh (YouTube API policy: stored data is refreshed or deleted within 30 days) and removes it
 * when the short stops playing. Stills supplied by the author are never touched.
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
    // Only what the check reads: with every field, the whole catalog did not fit in the worker.
    select: {
      title: true,
      status: true,
      still: true,
      hiddenReason: true,
      aiReview: { titleInThumbnail: true },
    },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const byId = new Map<number, Short>(shorts.docs.map((short) => [short.id, short as Short]))
  const sources = await payload.find({
    collection: 'sources',
    where: { short: { in: [...byId.keys()] }, provider: { in: ['youtube', 'vimeo'] } },
    select: {
      short: true,
      provider: true,
      externalId: true,
      url: true,
      status: true,
      embeddable: true,
      ageRestricted: true,
      checkNote: true,
      lastCheckedAt: true,
      problemSince: true,
      channel: true,
      thumbnailUrl: true,
    },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const sourceDocs = sources.docs as Source[]

  const checkedSince = Date.now() - RECHECK_AFTER_MS
  const recent = (source: Source) =>
    Boolean(source.lastCheckedAt && Date.parse(source.lastCheckedAt) > checkedSince)

  // One YouTube Data API request per 50 videos, when there is a key.
  const keys = ingestKeys()
  let api: Map<string, YouTubeVideo> | undefined
  const youtubeIds = sourceDocs
    .filter((s) => s.provider === 'youtube' && !recent(s))
    .map((s) => s.externalId)
  if (keys.youtube && youtubeIds.length > 0) {
    try {
      api = await fetchYouTubeVideos(youtubeIds, keys.youtube, fetchFn)
    } catch (error) {
      payload.logger.warn(`checkEmbeds: ${(error as Error).message}; using oEmbed only`)
    }
  }

  const summary: CheckSummary = {
    checked: 0,
    skipped: 0,
    problems: 0,
    inconclusive: 0,
    hidden: 0,
    stills: 0,
  }
  const results = new Map<number, { assessment: Assessment; reason?: HiddenReason }[]>()
  const now = new Date().toISOString()
  /** The playable state of each source after this check; inconclusive checks keep the stored one. */
  const playable = new Map<number, boolean>()
  const oembedThumbnails = new Map<number, string>()

  for (const source of sourceDocs) {
    if (recent(source)) {
      // Already checked tonight: what it found is stored, and counts for hiding its short.
      const stored: Assessment = {
        conclusive: true,
        status: source.status === 'broken' || source.status === 'private' ? source.status : 'ok',
        embeddable: source.embeddable !== false,
        ageRestricted: Boolean(source.ageRestricted),
        note: source.checkNote ?? '',
      }
      const shortId = shortIdOf(source)
      results.set(shortId, [
        ...(results.get(shortId) ?? []),
        { assessment: stored, reason: unplayableReason(stored) },
      ])
      playable.set(source.id, isPlayable(source))
      summary.skipped += 1
      continue
    }
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

    playable.set(source.id, assessment.conclusive ? isPlayable(assessment) : isPlayable(source))
    if (oembed.kind === 'ok' && oembed.thumbnailUrl)
      oembedThumbnails.set(source.id, oembed.thumbnailUrl)

    const shortId = shortIdOf(source)
    results.set(shortId, [...(results.get(shortId) ?? []), { assessment, reason }])

    await payload.update({
      collection: 'sources',
      id: source.id,
      data: {
        ...(assessment.conclusive
          ? {
              status: assessment.status,
              embeddable: assessment.embeddable,
              ageRestricted: assessment.ageRestricted,
              lastCheckedAt: now,
              problemSince: reason ? (source.problemSince ?? now) : null,
              checkNote: assessment.note,
            }
          : { checkNote: assessment.note }),
        ...channelGaps(source, oembed, apiVideo),
      },
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
    short.status = 'withdrawn'
    payload.logger.warn(`checkEmbeds: hid «${short.title}» (${reason})`)
  }

  await refreshStills(req, {
    shorts: [...byId.values()],
    sources: sourceDocs,
    playable,
    oembedThumbnails,
    fetchFn,
    pauseMs,
    summary,
  })
  return summary
}

/**
 * Fills in the channel's address, ID and name when the source lacks them (the catalog import only
 * recorded the name), from the provider's answers: the address is what lets an editor register the
 * channel for the nightly scan. Never overwrites what an editor wrote.
 */
export function channelGaps(
  source: Pick<Source, 'channel'>,
  oembed: OEmbedResult,
  api: YouTubeVideo | null | undefined,
): { channel?: Source['channel'] } {
  const current = source.channel ?? {}
  const ok = oembed.kind === 'ok' ? oembed : undefined
  const found = {
    url: ok?.authorUrl ?? null,
    externalId: api?.channelId ?? null,
    name: ok?.authorName ?? api?.channelTitle ?? null,
  }
  const missing = (['url', 'externalId', 'name'] as const).filter(
    (field) => !current[field] && found[field],
  )
  if (missing.length === 0) return {}
  return {
    channel: { ...current, ...Object.fromEntries(missing.map((field) => [field, found[field]])) },
  }
}

interface StillsContext {
  shorts: Short[]
  sources: Source[]
  playable: Map<number, boolean>
  oembedThumbnails: Map<number, string>
  fetchFn: Fetch
  pauseMs: number
  summary: CheckSummary
}

/**
 * Downloads the provider thumbnail of every playable published short whose still is missing or
 * came from the provider, and deletes the provider still of the shorts that no longer play.
 * Failures are logged and never stop the check.
 */
async function refreshStills(req: PayloadRequest, ctx: StillsContext) {
  const { payload } = req
  if (ctx.shorts.length === 0) return
  const stills = await payload.find({
    collection: 'stills',
    where: { short: { in: ctx.shorts.map((short) => short.id) } },
    select: { short: true, origin: true, fetchedAt: true },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  // By short, once: looking them up in the whole list for every short was quadratic.
  const stillsByShort = new Map<number, Still[]>()
  for (const still of stills.docs as Still[]) {
    const shortId = idOf(still.short)
    if (shortId !== undefined)
      stillsByShort.set(shortId, [...(stillsByShort.get(shortId) ?? []), still])
  }
  const sourcesByShort = new Map<number, Source[]>()
  for (const source of ctx.sources) {
    const shortId = shortIdOf(source)
    sourcesByShort.set(shortId, [...(sourcesByShort.get(shortId) ?? []), source])
  }
  const stillsOf = (shortId: number) => stillsByShort.get(shortId) ?? []

  for (const short of ctx.shorts) {
    try {
      const own = stillsOf(short.id)
      // An author still is final: the checker neither replaces nor removes it.
      if (own.some((still: Still) => still.origin === 'author')) continue
      const provider = own.filter((still) => still.origin === 'provider')
      const source = (sourcesByShort.get(short.id) ?? []).find((candidate) =>
        ctx.playable.get(candidate.id),
      )

      if (short.status !== 'published' || !source) {
        for (const still of provider)
          await payload.delete({ collection: 'stills', id: still.id, req })
        if (provider.length > 0 && idOf(short.still) !== undefined)
          await payload.update({ collection: 'shorts', id: short.id, data: { still: null }, req })
        continue
      }

      // Refreshed tonight already (a resumed check): nothing to download again.
      const fetchedAt = provider[0]?.fetchedAt
      if (fetchedAt && Date.parse(fetchedAt) > Date.now() - RECHECK_AFTER_MS) continue

      const candidates = thumbnailCandidates(
        source.provider,
        source.externalId,
        ctx.oembedThumbnails.get(source.id) ?? source.thumbnailUrl,
      )
      const thumbnail = await downloadThumbnail(candidates, ctx.fetchFn)
      if (ctx.pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, ctx.pauseMs))
      if (!thumbnail) {
        payload.logger.warn(
          `checkEmbeds: no thumbnail for «${short.title}»; keeping the current still`,
        )
        continue
      }
      const file = {
        data: thumbnail.data,
        mimetype: thumbnail.mimetype,
        name: `short-${short.id}-still.jpg`,
        size: thumbnail.data.length,
      }
      const data = {
        short: short.id,
        origin: 'provider' as const,
        source: source.id,
        fetchedAt: new Date().toISOString(),
      }
      const existing = provider[0]
      // A new still takes the AI review's finding that the thumbnail carries the title, so cards
      // draw none on top: the review usually runs before the first still exists. A refreshed
      // still keeps what it had (an editor may have changed it).
      const saved = existing
        ? await payload.update({ collection: 'stills', id: existing.id, data, file, req })
        : await payload.create({
            collection: 'stills',
            data: { ...data, includesTitle: short.aiReview?.titleInThumbnail === true },
            file,
            req,
          })
      if (idOf(short.still) !== saved.id)
        await payload.update({ collection: 'shorts', id: short.id, data: { still: saved.id }, req })
      // More than one provider still would be an orphan: keep the table tidy.
      for (const extra of provider.slice(1))
        await payload.delete({ collection: 'stills', id: extra.id, req })
      ctx.summary.stills += 1
    } catch (error) {
      payload.logger.warn(`checkEmbeds: still of «${short.title}»: ${(error as Error).message}`)
    }
  }
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
    { name: 'skipped', type: 'number', required: true },
    { name: 'problems', type: 'number', required: true },
    { name: 'inconclusive', type: 'number', required: true },
    { name: 'hidden', type: 'number', required: true },
    { name: 'stills', type: 'number', required: true },
  ],
  schedule: [{ cron: '0 0 3 * * *', queue: LONG_QUEUE }],
  handler: async ({ req }) => {
    const output = await checkEmbeds(req)
    req.payload.logger.info(
      `checkEmbeds: ${output.checked} sources checked (${output.skipped} already checked tonight), ${output.problems} problems, ${output.inconclusive} inconclusive, ${output.hidden} shorts hidden, ${output.stills} stills refreshed`,
    )
    return { output }
  },
}
