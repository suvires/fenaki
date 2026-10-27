import type { PayloadRequest } from 'payload'
import type { ScannedVideo } from '../../payload-types.ts'
import { captionsValue, type LanguageInfo } from '../languages.ts'
import { SKIP_REASONS, type SkipReason } from './rules.ts'

type Provider = 'youtube' | 'vimeo'

/** What the ledger records about one video, whatever became of it. */
export interface LedgerEntry {
  channelId?: number | null
  provider: Provider
  externalId: string
  url?: string | null
  title?: string | null
  durationSeconds?: number | null
  publishedAt?: string | null
  outcome: 'added' | 'skipped'
  skipReason?: SkipReason | 'failed' | null
  shortId?: number | null
  note?: string | null
  languages?: LanguageInfo | null
}

const CHUNK = 100

/** The ledger rows of these videos, by external id. */
export async function ledgerRows(
  req: PayloadRequest,
  provider: Provider,
  ids: string[],
): Promise<Map<string, ScannedVideo>> {
  const rows = new Map<string, ScannedVideo>()
  for (let start = 0; start < ids.length; start += CHUNK) {
    const found = await req.payload.find({
      collection: 'scanned-videos',
      where: {
        provider: { equals: provider },
        externalId: { in: ids.slice(start, start + CHUNK) },
      },
      depth: 0,
      limit: 0,
      pagination: false,
      req,
    })
    for (const row of found.docs) rows.set(row.externalId, row)
  }
  return rows
}

/**
 * Rows the scanner must judge again: videos that could not be checked or saved last time, and
 * the ones an editor asked to look at again. Fetched by id, whatever their age.
 */
export async function ledgerRetries(req: PayloadRequest, channelId: number, limit = 500) {
  const found = await req.payload.find({
    collection: 'scanned-videos',
    where: {
      channel: { equals: channelId },
      or: [{ skipReason: { equals: 'failed' } }, { reevaluate: { equals: true } }],
    },
    depth: 0,
    limit,
    pagination: false,
    req,
  })
  return found.docs
}

/** A row is settled when the scanner has judged it and nobody asked for another look. */
export const isSettled = (row: ScannedVideo) => !row.reevaluate && row.skipReason !== 'failed'

/** Marks videos the scan met again without judging them. One query for the whole page. */
export async function touchSeen(req: PayloadRequest, rows: ScannedVideo[]) {
  if (rows.length === 0) return
  await req.payload.update({
    collection: 'scanned-videos',
    where: { id: { in: rows.map((row) => row.id) } },
    data: { lastSeenAt: new Date().toISOString() },
    req,
  })
}

const languageData = (languages: LanguageInfo | null | undefined) =>
  languages
    ? {
        spokenLanguages: languages.spoken,
        subtitles: languages.subtitles,
        autoSubtitles: languages.autoSubtitles,
        captions: captionsValue(languages.hasCaptions),
        languageSource: languages.source,
      }
    : {}

/**
 * Writes what the scan found out about a video: creates its row the first time, updates it
 * afterwards. `existing` saves the lookup when the caller already has the row.
 */
export async function recordVideo(
  req: PayloadRequest,
  entry: LedgerEntry,
  existing?: ScannedVideo,
): Promise<void> {
  const now = new Date().toISOString()
  const row =
    existing ?? (await ledgerRows(req, entry.provider, [entry.externalId])).get(entry.externalId)
  const data = {
    ...(entry.channelId !== undefined ? { channel: entry.channelId } : {}),
    provider: entry.provider,
    externalId: entry.externalId,
    ...(entry.url !== undefined ? { url: entry.url } : {}),
    ...(entry.title !== undefined ? { title: entry.title } : {}),
    ...(entry.durationSeconds !== undefined ? { durationSeconds: entry.durationSeconds } : {}),
    ...(entry.publishedAt !== undefined ? { publishedAt: entry.publishedAt } : {}),
    outcome: entry.outcome,
    skipReason: entry.outcome === 'skipped' ? (entry.skipReason ?? null) : null,
    short: entry.outcome === 'added' ? (entry.shortId ?? null) : null,
    ...(entry.note !== undefined ? { note: entry.note } : {}),
    ...languageData(entry.languages),
    reevaluate: false,
    lastSeenAt: now,
  }
  if (row) {
    await req.payload.update({ collection: 'scanned-videos', id: row.id, data, req })
  } else {
    await req.payload.create({
      collection: 'scanned-videos',
      data: { ...data, firstSeenAt: now },
      req,
    })
  }
}

/** Counts of a channel's ledger by outcome and skip reason, for its page in the admin panel. */
export async function ledgerCounts(req: PayloadRequest, channelId: number) {
  const count = async (where: Record<string, unknown>) =>
    (
      await req.payload.count({
        collection: 'scanned-videos',
        where: { channel: { equals: channelId }, ...where },
        req,
      })
    ).totalDocs
  const added = await count({ outcome: { equals: 'added' } })
  const skipped = await count({ outcome: { equals: 'skipped' } })
  const reasons: Record<string, number> = {}
  for (const reason of [...SKIP_REASONS, 'failed']) {
    const total = await count({ skipReason: { equals: reason } })
    if (total > 0) reasons[reason] = total
  }
  return { added, skipped, reasons }
}
