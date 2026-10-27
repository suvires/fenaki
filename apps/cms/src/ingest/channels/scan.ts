import type { PayloadRequest } from 'payload'
import type { Channel } from '../../payload-types.ts'
import { assess, type Assessment } from '../check.ts'
import { createShortWithSource, type ChannelOrigin } from '../createShort.ts'
import { buildMetadata, ingestKeys, type VideoMetadata } from '../metadata.ts'
import { fetchOEmbed, type Fetch } from '../oembed.ts'
import { parseVideoUrl, type VideoRef } from '../url.ts'
import { fetchYouTubeVideos } from '../youtube.ts'
import { skipReason, SKIP_REASONS, type Candidate, type SkipReason } from './rules.ts'
import { fetchVimeoFeed } from './vimeo.ts'
import { FIRST_SCAN_LIMIT, listYouTubeUploads, lookupYouTubeChannel } from './youtube.ts'

/** Pause between Vimeo oEmbed requests: the scan runs at night and is in no hurry. */
const PAUSE_MS = 300

export type Outcome = SkipReason | 'failed'

export interface ScanSummary {
  /** Videos the channel published since the last scan. */
  found: number
  added: number
  skipped: Partial<Record<Outcome, number>>
  note: string
}

const OUTCOME_TEXT: Record<Outcome, string> = {
  duplicate: 'already in the catalog',
  private: 'private',
  'not-embeddable': 'embedding disabled',
  'age-restricted': 'age restricted',
  unavailable: 'unavailable',
  'unknown-duration': 'running time unknown',
  'too-short': 'too short',
  'too-long': 'too long',
  'not-a-short': 'trailer, clip or similar',
  failed: 'could not be checked or saved',
}

/** «Found 5 new videos: 2 added, 3 skipped (1 too short, 2 trailer, clip or similar).» */
export function scanNote(found: number, added: number, skipped: Partial<Record<Outcome, number>>) {
  const reasons = [...SKIP_REASONS, 'failed' as const]
    .filter((reason) => skipped[reason])
    .map((reason) => `${skipped[reason]} ${OUTCOME_TEXT[reason]}`)
  const total = Object.values(skipped).reduce((sum, n) => sum + (n ?? 0), 0)
  const plural = (n: number) => (n === 1 ? '' : 's')
  return (
    `Found ${found} new video${plural(found)}: ${added} added` +
    (total > 0 ? `, ${total} skipped (${reasons.join(', ')}).` : '.')
  )
}

/** A video that has not been looked at yet: what the rules need, and how to build its metadata. */
interface Evaluated {
  video: VideoRef
  candidate: Candidate
  build: () => Promise<VideoMetadata>
}

const candidateOf = (title: string, durationSeconds: number | null, a: Assessment): Candidate => ({
  title,
  durationSeconds,
  embeddable: a.embeddable,
  ageRestricted: a.ageRestricted,
  status: a.status,
})

const originOf = (channel: Channel): ChannelOrigin => ({
  id: channel.id,
  name: channel.name ?? null,
  url: channel.url,
  externalId: channel.externalId ?? null,
  kind: channel.kind,
  officialEvidence: channel.officialEvidence ?? null,
})

/** Ids of the videos that are already a source of any short. */
async function knownIds(req: PayloadRequest, provider: 'youtube' | 'vimeo', ids: string[]) {
  if (ids.length === 0) return new Set<string>()
  const found = await req.payload.find({
    collection: 'sources',
    where: { provider: { equals: provider }, externalId: { in: ids } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  return new Set(found.docs.map((source) => source.externalId))
}

/** YouTube: the uploads playlist for the list, then the Data API for what the rules need. */
async function youtubeCandidates(
  req: PayloadRequest,
  channel: Channel,
  since: Date | null,
  fetchFn: Fetch,
  tally: (reason: Outcome) => void,
): Promise<{ found: number; evaluated: Evaluated[] }> {
  const keys = ingestKeys()
  if (!keys.youtube) throw new Error('YOUTUBE_API_KEY is not set')
  if (!channel.externalId) throw new Error('the channel has no YouTube channel ID')
  const provider = await lookupYouTubeChannel(
    { provider: 'youtube', by: 'id', value: channel.externalId },
    keys.youtube,
    fetchFn,
  )
  if (!provider?.uploadsPlaylistId) throw new Error('YouTube does not know this channel')
  const uploads = await listYouTubeUploads(provider.uploadsPlaylistId, since, keys.youtube, fetchFn)
  const known = await knownIds(
    req,
    'youtube',
    uploads.map((upload) => upload.videoId),
  )
  const fresh = uploads.filter((upload) => {
    if (known.has(upload.videoId)) tally('duplicate')
    return !known.has(upload.videoId)
  })
  const details = await fetchYouTubeVideos(
    fresh.map((upload) => upload.videoId),
    keys.youtube,
    fetchFn,
  )
  const evaluated: Evaluated[] = []
  for (const { videoId } of fresh) {
    const api = details.get(videoId)
    // The API leaves out deleted and private videos.
    if (!api) {
      tally('private')
      continue
    }
    const video = {
      provider: 'youtube' as const,
      externalId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    }
    evaluated.push({
      video,
      candidate: {
        title: api.title,
        durationSeconds: api.durationSeconds,
        embeddable: api.embeddable,
        ageRestricted: api.ageRestricted,
        status: api.privacyStatus === 'private' ? 'private' : 'ok',
      },
      build: () => buildMetadata(video, undefined, api, keys, fetchFn),
    })
  }
  return { found: uploads.length, evaluated }
}

/** Vimeo: the public RSS feed for the list, oEmbed for what the rules need. */
async function vimeoCandidates(
  req: PayloadRequest,
  channel: Channel,
  since: Date | null,
  fetchFn: Fetch,
  pauseMs: number,
  tally: (reason: Outcome) => void,
): Promise<{ found: number; evaluated: Evaluated[] }> {
  if (!channel.externalId) throw new Error('the channel has no Vimeo feed path')
  const feed = await fetchVimeoFeed(channel.externalId, fetchFn)
  const items = feed.items
    .filter((item) => !since || !item.publishedAt || new Date(item.publishedAt) > since)
    .slice(0, since ? undefined : FIRST_SCAN_LIMIT)
  const videos = items.flatMap((item) => {
    const video = parseVideoUrl(item.url)
    if (!video) tally('failed')
    return video ? [video] : []
  })
  const known = await knownIds(
    req,
    'vimeo',
    videos.map((video) => video.externalId),
  )
  const keys = ingestKeys()
  const evaluated: Evaluated[] = []
  for (const video of videos) {
    if (known.has(video.externalId)) {
      tally('duplicate')
      continue
    }
    const oembed = await fetchOEmbed(video, fetchFn)
    if (pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, pauseMs))
    const assessment = assess(oembed)
    if (!assessment.conclusive) {
      tally('failed')
      continue
    }
    const ok = oembed.kind === 'ok' ? oembed : undefined
    evaluated.push({
      video,
      candidate: candidateOf(ok?.title ?? '', ok?.durationSeconds ?? null, assessment),
      build: () => buildMetadata(video, oembed, undefined, keys, fetchFn),
    })
  }
  return { found: items.length, evaluated }
}

/**
 * Looks for videos the channel published since the last scan and puts the ones that look like
 * shorts in the review queue. Throws when the provider cannot be asked. Nothing is published, and
 * `lastScannedAt` moves forward only when every video was handled, so a failure is retried.
 */
export async function scanChannel(
  req: PayloadRequest,
  channel: Channel,
  fetchFn: Fetch = fetch,
  pauseMs = PAUSE_MS,
): Promise<ScanSummary> {
  const startedAt = new Date()
  const since = channel.lastScannedAt ? new Date(channel.lastScannedAt) : null
  const skipped: Partial<Record<Outcome, number>> = {}
  const tally = (reason: Outcome) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1
  }

  const { found, evaluated } =
    channel.provider === 'youtube'
      ? await youtubeCandidates(req, channel, since, fetchFn, tally)
      : await vimeoCandidates(req, channel, since, fetchFn, pauseMs, tally)

  const filter = { minSeconds: channel.minDurationSeconds, maxSeconds: channel.maxDurationSeconds }
  let added = 0
  for (const { video, candidate, build } of evaluated) {
    const reason = skipReason(candidate, filter)
    if (reason) {
      tally(reason)
      continue
    }
    try {
      const metadata = await build()
      await createShortWithSource(req, metadata, {
        origin: `Added by the scan of the channel «${channel.name}»`,
        channel: originOf(channel),
        defaultLanguage: channel.defaultLanguage,
      })
      added += 1
    } catch (error) {
      tally('failed')
      req.payload.logger.warn(
        `scanChannels: ${channel.name}: ${video.externalId}: ${(error as Error).message}`,
      )
    }
  }

  const note = scanNote(found, added, skipped)
  await req.payload.update({
    collection: 'channels',
    id: channel.id,
    data: {
      lastScanNote: `${startedAt.toISOString()} · ${note}`,
      ...((skipped.failed ?? 0) === 0 ? { lastScannedAt: startedAt.toISOString() } : {}),
    },
    req,
  })
  return { found, added, skipped, note }
}

export type ChannelScan = ({ ok: true } & ScanSummary) | { ok: false; note: string }

/** Scans one channel and never throws: a failure is written on the channel and returned. */
export async function runChannelScan(
  req: PayloadRequest,
  channel: Channel,
  fetchFn: Fetch = fetch,
  pauseMs = PAUSE_MS,
): Promise<ChannelScan> {
  try {
    const summary = await scanChannel(req, channel, fetchFn, pauseMs)
    req.payload.logger.info(`scanChannels: ${channel.name}: ${summary.note}`)
    return { ok: true, ...summary }
  } catch (error) {
    const note = `Scan failed: ${(error as Error).message}`
    req.payload.logger.warn(`scanChannels: ${channel.name}: ${note}`)
    await req.payload
      .update({
        collection: 'channels',
        id: channel.id,
        data: { lastScanNote: `${new Date().toISOString()} · ${note}` },
        req,
      })
      .catch(() => undefined)
    return { ok: false, note }
  }
}

export interface ScanAllSummary {
  channels: number
  failed: number
  added: number
}

/** The nightly job: every active channel, one by one, so one failing channel stops nothing. */
export async function scanActiveChannels(
  req: PayloadRequest,
  fetchFn: Fetch = fetch,
  pauseMs = PAUSE_MS,
): Promise<ScanAllSummary> {
  const channels = await req.payload.find({
    collection: 'channels',
    where: { active: { equals: true } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const summary: ScanAllSummary = { channels: channels.docs.length, failed: 0, added: 0 }
  for (const channel of channels.docs) {
    const result = await runChannelScan(req, channel, fetchFn, pauseMs)
    if (result.ok) summary.added += result.added
    else summary.failed += 1
  }
  return summary
}
