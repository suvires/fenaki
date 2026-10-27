import type { Fetch } from '../oembed.ts'
import type { ChannelRef } from './url.ts'

const API = 'https://www.googleapis.com/youtube/v3'

export interface YouTubeChannel {
  id: string
  name: string
  /** Every public upload of the channel, newest first. */
  uploadsPlaylistId: string | null
}

async function api<T>(path: string, params: Record<string, string>, fetchFn: Fetch): Promise<T> {
  const url = new URL(`${API}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = await fetchFn(url, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`YouTube Data API answered HTTP ${response.status}`)
  return (await response.json()) as T
}

/** Looks a channel up by id, `@handle` or legacy username. One quota unit. Null when it does not exist. */
export async function lookupYouTubeChannel(
  ref: Extract<ChannelRef, { provider: 'youtube' }>,
  apiKey: string,
  fetchFn: Fetch = fetch,
): Promise<YouTubeChannel | null> {
  const lookup = { id: 'id', handle: 'forHandle', username: 'forUsername' }[ref.by]
  const body = await api<{
    items?: {
      id: string
      snippet?: { title?: string }
      contentDetails?: { relatedPlaylists?: { uploads?: string } }
    }[]
  }>('channels', { part: 'snippet,contentDetails', [lookup]: ref.value, key: apiKey }, fetchFn)
  const item = body.items?.[0]
  if (!item) return null
  return {
    id: item.id,
    name: item.snippet?.title ?? '',
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
  }
}

export interface Upload {
  videoId: string
  publishedAt: string | null
}

/** The first scan takes the latest videos only; later ones read back as far as the last scan. */
export const FIRST_SCAN_LIMIT = 50
const MAX_PAGES = 4

/**
 * Videos of an uploads playlist published after `since`, newest first. Without `since` (the first
 * scan) it returns the latest 50. One quota unit per 50 videos.
 */
export async function listYouTubeUploads(
  playlistId: string,
  since: Date | null,
  apiKey: string,
  fetchFn: Fetch = fetch,
): Promise<Upload[]> {
  const uploads: Upload[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const body = await api<{
      nextPageToken?: string
      items?: { contentDetails?: { videoId?: string; videoPublishedAt?: string } }[]
    }>(
      'playlistItems',
      {
        part: 'contentDetails',
        playlistId,
        maxResults: String(FIRST_SCAN_LIMIT),
        key: apiKey,
        ...(pageToken ? { pageToken } : {}),
      },
      fetchFn,
    )
    let reachedOld = false
    for (const item of body.items ?? []) {
      const videoId = item.contentDetails?.videoId
      if (!videoId) continue
      const publishedAt = item.contentDetails?.videoPublishedAt ?? null
      if (since && publishedAt && new Date(publishedAt) <= since) {
        reachedOld = true
        break
      }
      uploads.push({ videoId, publishedAt })
    }
    pageToken = body.nextPageToken
    if (reachedOld || !since || !pageToken) break
  }
  return since ? uploads : uploads.slice(0, FIRST_SCAN_LIMIT)
}
