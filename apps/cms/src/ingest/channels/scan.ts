import type { PayloadRequest } from 'payload'
import type { Channel, ScannedVideo } from '../../payload-types.ts'
import { assess, type Assessment } from '../check.ts'
import { createShortWithSource, type ChannelOrigin } from '../createShort.ts'
import {
  DEFAULT_CATALOG_LANGUAGES,
  languageList,
  noLanguages,
  withDefaultLanguage,
  youtubeLanguages,
  type LanguageInfo,
} from '../languages.ts'
import { buildMetadata, ingestKeys, type IngestKeys, type VideoMetadata } from '../metadata.ts'
import { fetchOEmbed, type Fetch, type OEmbedResult } from '../oembed.ts'
import { parseVideoUrl, type VideoRef } from '../url.ts'
import { fetchYouTubeVideos, type YouTubeVideo } from '../youtube.ts'
import { isSettled, ledgerRetries, ledgerRows, recordVideo, touchSeen } from './ledger.ts'
import { skipReason, SKIP_REASONS, type Candidate, type SkipReason } from './rules.ts'
import {
  fetchVimeoApiPage,
  fetchVimeoFeed,
  fetchVimeoTextTracks,
  fetchVimeoWebPage,
  isVimeoUser,
  type VimeoDetails,
} from './vimeo.ts'
import { listYouTubeUploadsPage, lookupYouTubeChannel } from './youtube.ts'

/** Pause between Vimeo oEmbed requests: the scan runs at night and is in no hurry. */
const PAUSE_MS = 300

/** The most videos one channel's run lists. A longer backlog resumes where it stopped next run. */
export const MAX_VIDEOS_PER_RUN = 2000

export type Outcome = SkipReason | 'failed'

export interface ScanSummary {
  /** Videos the ledger had not settled: new ones, and the ones judged again. */
  found: number
  added: number
  skipped: Partial<Record<Outcome, number>>
  /** The scan read the channel back to its first video. */
  complete: boolean
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
  'not-in-catalog-language': 'not in a catalog language',
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

/** A video a provider listing returned, before anything is known about it. */
interface Listed {
  video: VideoRef
  publishedAt: string | null
  /** Vimeo API listings describe the video already. */
  vimeo?: VimeoDetails
}

/** A video that has been looked at: what the rules need, and how to build its metadata. */
interface Evaluated {
  listed: Listed
  title: string
  durationSeconds: number | null
  candidate: Candidate
  build: () => Promise<VideoMetadata>
}

/** What judging a listed video can come to without the rules: the provider has nothing on it. */
type Judged =
  | { kind: 'evaluated'; evaluated: Evaluated }
  | { kind: 'skip'; listed: Listed; reason: Outcome; note: string }

/** One provider's way to list a channel page by page and to look at the videos on a page. */
interface Adapter {
  /** The videos of one page, newest first, from `token` (the start when null). */
  page(token: string | null): Promise<{ items: Listed[]; next: string | null }>
  judge(items: Listed[], context: Context): Promise<Judged[]>
}

interface Context {
  req: PayloadRequest
  channel: Channel
  fetchFn: Fetch
  pauseMs: number
  keys: IngestKeys
  catalogLanguages: string[]
}

const originOf = (channel: Channel): ChannelOrigin => ({
  id: channel.id,
  name: channel.name ?? null,
  url: channel.url,
  externalId: channel.externalId ?? null,
  kind: channel.kind,
  officialEvidence: channel.officialEvidence ?? null,
})

/** The languages the catalog takes, from the settings; Spanish when they are not there. */
export async function catalogLanguages(req: PayloadRequest): Promise<string[]> {
  try {
    const settings = await req.payload.findGlobal({ slug: 'catalog-settings', depth: 0, req })
    const codes = languageList(settings.catalogLanguages ?? [])
    return codes.length > 0 ? codes : DEFAULT_CATALOG_LANGUAGES
  } catch {
    return DEFAULT_CATALOG_LANGUAGES
  }
}

/** Ids of the videos that are already a source of any short, with that short. */
async function knownSources(req: PayloadRequest, provider: 'youtube' | 'vimeo', ids: string[]) {
  const found = new Map<string, number | null>()
  if (ids.length === 0) return found
  const sources = await req.payload.find({
    collection: 'sources',
    where: { provider: { equals: provider }, externalId: { in: ids } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  for (const source of sources.docs)
    found.set(source.externalId, typeof source.short === 'object' ? source.short.id : source.short)
  return found
}

const youtubeAdapter = async (context: Context): Promise<Adapter> => {
  const { channel, fetchFn, keys } = context
  if (!keys.youtube) throw new Error('YOUTUBE_API_KEY is not set')
  if (!channel.externalId) throw new Error('the channel has no YouTube channel ID')
  const provider = await lookupYouTubeChannel(
    { provider: 'youtube', by: 'id', value: channel.externalId },
    keys.youtube,
    fetchFn,
  )
  if (!provider?.uploadsPlaylistId) throw new Error('YouTube does not know this channel')
  const playlist = provider.uploadsPlaylistId
  const youtubeKey = keys.youtube

  const listed = (videoId: string, publishedAt: string | null): Listed => ({
    video: {
      provider: 'youtube',
      externalId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    },
    publishedAt,
  })

  return {
    async page(token) {
      const { uploads, next } = await listYouTubeUploadsPage(playlist, token, youtubeKey, fetchFn)
      return { items: uploads.map((u) => listed(u.videoId, u.publishedAt)), next }
    },
    async judge(items) {
      const details = await fetchYouTubeVideos(
        items.map((item) => item.video.externalId),
        youtubeKey,
        fetchFn,
      )
      return items.map((item): Judged => {
        const api = details.get(item.video.externalId)
        // The API leaves out deleted and private videos.
        if (!api)
          return { kind: 'skip', listed: item, reason: 'private', note: 'Deleted or private.' }
        return { kind: 'evaluated', evaluated: youtubeEvaluated(item, api, context) }
      })
    },
  }
}

function youtubeEvaluated(item: Listed, api: YouTubeVideo, context: Context): Evaluated {
  const languages = withDefaultLanguage(youtubeLanguages(api), context.channel.defaultLanguage)
  return {
    listed: item,
    title: api.title,
    durationSeconds: api.durationSeconds,
    candidate: {
      title: api.title,
      durationSeconds: api.durationSeconds,
      embeddable: api.embeddable,
      ageRestricted: api.ageRestricted,
      status: api.privacyStatus === 'private' ? 'private' : 'ok',
      languages,
    },
    build: () => buildMetadata(item.video, undefined, api, context.keys, context.fetchFn),
  }
}

/**
 * Vimeo lists a catalogue three ways: the API with an app access token (the whole catalogue,
 * described, with language and subtitle tracks), a user's public video pages (the whole
 * catalogue, ids only) and the RSS feed (the latest ten videos, the only listing channels
 * have without a token).
 */
const vimeoAdapter = async (context: Context): Promise<Adapter> => {
  const { channel, fetchFn, keys } = context
  const path = channel.externalId
  if (!path) throw new Error('the channel has no Vimeo feed path')
  const token = keys.vimeo
  const pageNumber = (value: string | null) => (value ? Number(value) || 1 : 1)

  const toListed = (id: string, url: string, publishedAt: string | null, details?: VimeoDetails) =>
    ({
      video: { provider: 'vimeo', externalId: id, url },
      publishedAt,
      ...(details ? { vimeo: details } : {}),
    }) satisfies Listed

  const rss = async () => {
    const feed = await fetchVimeoFeed(path, fetchFn)
    return feed.items.flatMap((item) => {
      const video = parseVideoUrl(item.url)
      return video ? [{ video, publishedAt: item.publishedAt }] : []
    })
  }

  return {
    async page(cursor) {
      if (token) {
        const page = await fetchVimeoApiPage(path, pageNumber(cursor), token, fetchFn)
        return {
          items: page.videos.map((v) => toListed(v.id, v.url, v.publishedAt, v.details)),
          next: page.next ? String(page.next) : null,
        }
      }
      if (isVimeoUser(path)) {
        const page = await fetchVimeoWebPage(path, pageNumber(cursor), fetchFn)
        // The public pages are not an API: when the first one reads empty, the feed still works.
        if (page.videos.length === 0 && pageNumber(cursor) === 1)
          return { items: await rss(), next: null }
        return {
          items: page.videos.map((v) => toListed(v.id, v.url, v.publishedAt)),
          next: page.next ? String(page.next) : null,
        }
      }
      return { items: await rss(), next: null }
    },
    async judge(items) {
      const judged: Judged[] = []
      for (const item of items) {
        judged.push(
          item.vimeo
            ? await vimeoFromApi(item, item.vimeo, context)
            : await vimeoFromOEmbed(item, context),
        )
      }
      return judged
    },
  }
}

async function vimeoFromOEmbed(item: Listed, context: Context): Promise<Judged> {
  const oembed = await fetchOEmbed(item.video, context.fetchFn)
  if (context.pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, context.pauseMs))
  const assessment = assess(oembed)
  if (!assessment.conclusive)
    return { kind: 'skip', listed: item, reason: 'failed', note: assessment.note }
  const ok = oembed.kind === 'ok' ? oembed : undefined
  const languages = withDefaultLanguage(noLanguages(), context.channel.defaultLanguage)
  return {
    kind: 'evaluated',
    evaluated: {
      listed: item,
      title: ok?.title ?? '',
      durationSeconds: ok?.durationSeconds ?? null,
      candidate: candidateOf(ok?.title ?? '', ok?.durationSeconds ?? null, assessment, languages),
      build: () =>
        buildMetadata(item.video, oembed, undefined, context.keys, context.fetchFn, { languages }),
    },
  }
}

async function vimeoFromApi(
  item: Listed,
  details: VimeoDetails,
  context: Context,
): Promise<Judged> {
  let languages: LanguageInfo = {
    ...noLanguages(),
    spoken: languageList([details.language]),
    source: details.language ? 'provider' : null,
  }
  languages = withDefaultLanguage(languages, context.channel.defaultLanguage)
  // Subtitle tracks matter only for a video spoken outside the catalog: one request for those.
  const foreign =
    languages.spoken.length > 0 &&
    !languages.spoken.some((code) => code === 'zxx' || context.catalogLanguages.includes(code))
  if (foreign && context.keys.vimeo) {
    try {
      const tracks = await fetchVimeoTextTracks(
        item.video.externalId,
        context.keys.vimeo,
        context.fetchFn,
      )
      languages = { ...languages, subtitles: languageList(tracks), hasCaptions: tracks.length > 0 }
    } catch {
      // The tracks are a bonus: without them the video is judged by its spoken language alone.
    }
  }
  const oembed: OEmbedResult = {
    kind: 'ok',
    title: details.title,
    authorName: details.authorName,
    authorUrl: details.authorUrl,
    thumbnailUrl: details.thumbnailUrl,
    durationSeconds: details.durationSeconds,
    uploadedAt: item.publishedAt,
  }
  const candidate: Candidate = {
    title: details.title,
    durationSeconds: details.durationSeconds,
    embeddable: details.embeddable,
    ageRestricted: false,
    status: details.public ? 'ok' : 'private',
    languages,
  }
  return {
    kind: 'evaluated',
    evaluated: {
      listed: item,
      title: details.title,
      durationSeconds: details.durationSeconds,
      candidate,
      build: () =>
        buildMetadata(item.video, oembed, undefined, context.keys, context.fetchFn, {
          description: details.description,
          languages,
        }),
    },
  }
}

const candidateOf = (
  title: string,
  durationSeconds: number | null,
  a: Assessment,
  languages: LanguageInfo,
): Candidate => ({
  title,
  durationSeconds,
  embeddable: a.embeddable,
  ageRestricted: a.ageRestricted,
  status: a.status,
  languages,
})

export interface ScanOptions {
  /** Cap on the videos listed this run (default {@link MAX_VIDEOS_PER_RUN}). */
  maxVideos?: number
}

/**
 * Reads a channel and puts the videos that look like shorts in the review queue. Throws when the
 * provider cannot be asked. Nothing is published.
 *
 * The ledger (`scanned-videos`) is the source of truth: a video already in it is not fetched or
 * judged again, except those that failed or that an editor asked to look at again. A channel
 * whose backlog is not yet read (or flagged «Revisar todo el canal») is walked from its newest
 * video to its first, up to {@link MAX_VIDEOS_PER_RUN} per run, resuming where it stopped; once
 * the backlog is read a scan stops at the first page it already knows entirely.
 */
export async function scanChannel(
  req: PayloadRequest,
  channel: Channel,
  fetchFn: Fetch = fetch,
  pauseMs = PAUSE_MS,
  options: ScanOptions = {},
): Promise<ScanSummary> {
  const startedAt = new Date()
  const skipped: Partial<Record<Outcome, number>> = {}
  const tally = (reason: Outcome) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1
  }
  const context: Context = {
    req,
    channel,
    fetchFn,
    pauseMs,
    keys: ingestKeys(),
    catalogLanguages: await catalogLanguages(req),
  }
  const adapter =
    channel.provider === 'youtube' ? await youtubeAdapter(context) : await vimeoAdapter(context)
  const filter = { minSeconds: channel.minDurationSeconds, maxSeconds: channel.maxDurationSeconds }
  const full = !channel.backlogComplete || Boolean(channel.rescanAll)
  const maxVideos = options.maxVideos ?? MAX_VIDEOS_PER_RUN
  let found = 0
  let added = 0

  /** Judges videos the ledger has not settled and records what became of each. */
  const judgeAndRecord = async (items: Listed[], rows: Map<string, ScannedVideo>) => {
    if (items.length === 0) return
    found += items.length
    let judged: Judged[]
    try {
      judged = await adapter.judge(items, context)
    } catch (error) {
      // The provider failed for the whole batch: keep each video retryable.
      for (const item of items) {
        tally('failed')
        await record(item, 'failed', (error as Error).message, rows)
      }
      return
    }
    for (const entry of judged) {
      if (entry.kind === 'skip') {
        tally(entry.reason)
        await record(entry.listed, entry.reason, entry.note, rows)
        continue
      }
      const { evaluated } = entry
      const reason = skipReason(evaluated.candidate, filter, context.catalogLanguages)
      if (reason) {
        tally(reason)
        await recordEvaluated(evaluated, reason, rows)
        continue
      }
      try {
        const metadata = await evaluated.build()
        await createShortWithSource(req, metadata, {
          origin: `Added by the scan of the channel «${channel.name}»`,
          channel: originOf(channel),
          defaultLanguage: channel.defaultLanguage,
        })
        added += 1
      } catch (error) {
        tally('failed')
        req.payload.logger.warn(
          `scanChannels: ${channel.name}: ${evaluated.listed.video.externalId}: ${(error as Error).message}`,
        )
        await recordEvaluated(evaluated, 'failed', rows, (error as Error).message)
      }
    }
  }

  const record = (item: Listed, reason: Outcome, note: string, rows: Map<string, ScannedVideo>) =>
    recordVideo(
      req,
      {
        channelId: channel.id,
        provider: item.video.provider,
        externalId: item.video.externalId,
        url: item.video.url,
        publishedAt: item.publishedAt,
        outcome: 'skipped',
        skipReason: reason,
        note,
      },
      rows.get(item.video.externalId),
    )

  const recordEvaluated = (
    evaluated: Evaluated,
    reason: Outcome,
    rows: Map<string, ScannedVideo>,
    note?: string,
  ) =>
    recordVideo(
      req,
      {
        channelId: channel.id,
        provider: evaluated.listed.video.provider,
        externalId: evaluated.listed.video.externalId,
        url: evaluated.listed.video.url,
        title: evaluated.title,
        durationSeconds: evaluated.durationSeconds,
        publishedAt: evaluated.listed.publishedAt,
        outcome: 'skipped',
        skipReason: reason,
        note: note ?? OUTCOME_TEXT[reason],
        languages: evaluated.candidate.languages ?? null,
      },
      rows.get(evaluated.listed.video.externalId),
    )

  // 1. Videos to judge again: failed last time, or an editor asked.
  const handled = new Set<string>()
  const retries = await ledgerRetries(req, channel.id)
  if (retries.length > 0) {
    const retryRows = new Map(retries.map((row) => [row.externalId, row]))
    const items = retries
      .filter((row) => row.provider === channel.provider)
      .map((row): Listed => ({
        video: {
          provider: row.provider,
          externalId: row.externalId,
          url:
            row.url ||
            `https://${row.provider === 'youtube' ? 'www.youtube.com/watch?v=' : 'vimeo.com/'}${row.externalId}`,
        },
        publishedAt: row.publishedAt ?? null,
      }))
    for (const item of items) handled.add(item.video.externalId)
    await judgeAndRecord(items, retryRows)
  }

  // 2. The listing, page by page.
  let token: string | null = full ? (channel.backlogCursor ?? null) : null
  let listedCount = 0
  let reachedEnd = false
  for (;;) {
    let page: Awaited<ReturnType<Adapter['page']>>
    try {
      page = await adapter.page(token)
    } catch (error) {
      // A saved position can go stale; the ledger makes reading from the start safe.
      if (token === null) throw error
      page = await adapter.page(null)
    }
    const items = page.items.filter((item) => !handled.has(item.video.externalId))
    listedCount += page.items.length
    for (const item of items) handled.add(item.video.externalId)

    const ids = items.map((item) => item.video.externalId)
    const provider = channel.provider
    const rows = await ledgerRows(req, provider, ids)
    await touchSeen(req, [...rows.values()].filter(isSettled))
    const unknown = items.filter((item) => !rows.has(item.video.externalId))

    // Already a short through another route: the ledger learns it, nothing else to do.
    const sources = await knownSources(
      req,
      provider,
      unknown.map((item) => item.video.externalId),
    )
    const fresh: Listed[] = []
    for (const item of unknown) {
      const shortId = sources.get(item.video.externalId)
      if (shortId === undefined) {
        fresh.push(item)
        continue
      }
      found += 1
      tally('duplicate')
      await recordVideo(req, {
        channelId: channel.id,
        provider,
        externalId: item.video.externalId,
        url: item.video.url,
        publishedAt: item.publishedAt,
        outcome: 'added',
        shortId,
        note: 'Already in the catalog.',
      })
    }
    await judgeAndRecord(fresh, new Map())

    token = page.next
    if (token === null) {
      reachedEnd = true
      break
    }
    // Once the backlog is read, a page the ledger knew entirely means everything older is known.
    if (!full && unknown.length === 0) {
      reachedEnd = true
      break
    }
    if (full && listedCount >= maxVideos) break
  }

  const complete = full ? reachedEnd : true
  const note =
    scanNote(found, added, skipped) +
    (full && !reachedEnd ? ' The backlog continues in the next scan.' : '')
  await req.payload.update({
    collection: 'channels',
    id: channel.id,
    data: {
      lastScanNote: `${startedAt.toISOString()} · ${note}`,
      lastScannedAt: startedAt.toISOString(),
      ...(full
        ? {
            backlogComplete: reachedEnd,
            backlogCursor: reachedEnd ? null : token,
            ...(reachedEnd ? { rescanAll: false } : {}),
          }
        : {}),
    },
    req,
  })
  return { found, added, skipped, complete, note }
}

export type ChannelScan = ({ ok: true } & ScanSummary) | { ok: false; note: string }

/** Scans one channel and never throws: a failure is written on the channel and returned. */
export async function runChannelScan(
  req: PayloadRequest,
  channel: Channel,
  fetchFn: Fetch = fetch,
  pauseMs = PAUSE_MS,
  options: ScanOptions = {},
): Promise<ChannelScan> {
  try {
    const summary = await scanChannel(req, channel, fetchFn, pauseMs, options)
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
