import type { Fetch } from './oembed.ts'

/** What the YouTube Data API says about a video. Needs YOUTUBE_API_KEY; one quota unit per 50 videos. */
export interface YouTubeVideo {
  id: string
  title: string
  channelId: string | null
  channelTitle: string | null
  durationSeconds: number | null
  embeddable: boolean
  privacyStatus: string | null
  ageRestricted: boolean
  publishedAt: string | null
  /** BCP 47, when the uploader set it. */
  audioLanguage: string | null
  /** BCP 47 of the title and description, when the uploader set it. */
  defaultLanguage: string | null
  /**
   * `contentDetails.caption`: some caption track exists. The languages of the tracks are not in
   * `videos.list`; `captions.list` has them but costs 50 quota units and needs the owner's OAuth.
   */
  hasCaptions: boolean
  description: string | null
  thumbnailUrl: string | null
}

/** ISO 8601 durations as YouTube writes them («PT1H2M3S», «P0D»). */
export function parseIsoDuration(value: string | null | undefined): number | null {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value ?? '')
  if (!match) return null
  const [, d, h, m, s] = match.map((part) => Number(part ?? 0))
  const total = (d ?? 0) * 86_400 + (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0)
  return total > 0 ? total : null
}

interface ApiVideo {
  id: string
  snippet?: {
    title?: string
    channelId?: string
    channelTitle?: string
    publishedAt?: string
    description?: string
    defaultLanguage?: string
    defaultAudioLanguage?: string
    thumbnails?: Record<string, { url?: string }>
  }
  contentDetails?: { duration?: string; caption?: string; contentRating?: { ytRating?: string } }
  status?: { embeddable?: boolean; privacyStatus?: string }
}

export function toYouTubeVideo(item: ApiVideo): YouTubeVideo {
  const thumbs = item.snippet?.thumbnails ?? {}
  return {
    id: item.id,
    title: item.snippet?.title ?? '',
    channelId: item.snippet?.channelId ?? null,
    channelTitle: item.snippet?.channelTitle ?? null,
    durationSeconds: parseIsoDuration(item.contentDetails?.duration),
    embeddable: item.status?.embeddable !== false,
    privacyStatus: item.status?.privacyStatus ?? null,
    ageRestricted: item.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted',
    publishedAt: item.snippet?.publishedAt ?? null,
    audioLanguage: item.snippet?.defaultAudioLanguage ?? null,
    defaultLanguage: item.snippet?.defaultLanguage ?? null,
    hasCaptions: item.contentDetails?.caption === 'true',
    description: item.snippet?.description || null,
    thumbnailUrl: (thumbs.maxres ?? thumbs.high ?? thumbs.medium ?? thumbs.default)?.url ?? null,
  }
}

/**
 * Looks up to 50 videos per request. Videos the API does not return are deleted or private.
 * Throws when the API fails, so callers fall back to oEmbed.
 */
export async function fetchYouTubeVideos(
  ids: string[],
  apiKey: string,
  fetchFn: Fetch = fetch,
): Promise<Map<string, YouTubeVideo>> {
  const found = new Map<string, YouTubeVideo>()
  for (let start = 0; start < ids.length; start += 50) {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos')
    url.searchParams.set('part', 'snippet,contentDetails,status')
    url.searchParams.set('id', ids.slice(start, start + 50).join(','))
    url.searchParams.set('key', apiKey)
    const response = await fetchFn(url, { signal: AbortSignal.timeout(15_000) })
    if (!response.ok) throw new Error(`YouTube Data API answered HTTP ${response.status}`)
    const body = (await response.json()) as { items?: ApiVideo[] }
    for (const item of body.items ?? []) found.set(item.id, toYouTubeVideo(item))
  }
  return found
}
