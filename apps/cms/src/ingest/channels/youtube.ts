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

/** `playlistItems.list` allows 50 per page, at one quota unit a page. */
export const PLAYLIST_PAGE_SIZE = 50

/**
 * One page of an uploads playlist, newest first, from `pageToken` (the start when null).
 * `next` is null on the last page. One quota unit.
 */
export async function listYouTubeUploadsPage(
  playlistId: string,
  pageToken: string | null,
  apiKey: string,
  fetchFn: Fetch = fetch,
): Promise<{ uploads: Upload[]; next: string | null }> {
  const body = await api<{
    nextPageToken?: string
    items?: { contentDetails?: { videoId?: string; videoPublishedAt?: string } }[]
  }>(
    'playlistItems',
    {
      part: 'contentDetails',
      playlistId,
      maxResults: String(PLAYLIST_PAGE_SIZE),
      key: apiKey,
      ...(pageToken ? { pageToken } : {}),
    },
    fetchFn,
  )
  const uploads = (body.items ?? []).flatMap((item) => {
    const videoId = item.contentDetails?.videoId
    return videoId ? [{ videoId, publishedAt: item.contentDetails?.videoPublishedAt ?? null }] : []
  })
  return { uploads, next: body.nextPageToken ?? null }
}
