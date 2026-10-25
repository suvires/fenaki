import type { VideoRef } from './url.ts'

export type Fetch = typeof fetch

/** What a provider's public oEmbed endpoint says about a video. No API key needed. */
export type OEmbedResult =
  | {
      kind: 'ok'
      title: string
      authorName: string | null
      authorUrl: string | null
      thumbnailUrl: string | null
      /** Vimeo only: YouTube's oEmbed has no running time. */
      durationSeconds: number | null
      /** Vimeo only. */
      uploadedAt: string | null
    }
  /** The owner switched embedding off. */
  | { kind: 'not-embeddable'; httpStatus: number }
  | { kind: 'private'; httpStatus: number }
  /** Removed, or never existed. Vimeo also answers this for private videos. */
  | { kind: 'missing'; httpStatus: number }
  /** Inconclusive: the provider failed or rate-limited us. Never a reason to hide a short. */
  | { kind: 'error'; message: string }

const ENDPOINTS = {
  youtube: 'https://www.youtube.com/oembed',
  vimeo: 'https://vimeo.com/api/oembed.json',
} as const

export function oembedUrl(video: Pick<VideoRef, 'provider' | 'url'>): string {
  const url = new URL(ENDPOINTS[video.provider])
  url.searchParams.set('url', video.url)
  url.searchParams.set('format', 'json')
  return url.toString()
}

/** Maps an oEmbed HTTP status to what it means for embedding. */
export function classifyStatus(
  provider: VideoRef['provider'],
  status: number,
): Exclude<OEmbedResult['kind'], 'ok'> {
  if (status === 404) return 'missing'
  // YouTube: 401 when embedding is disabled, 403 for private videos.
  // Vimeo: 403 when the owner restricts where the video can be embedded.
  if (status === 401) return provider === 'youtube' ? 'not-embeddable' : 'private'
  if (status === 403) return provider === 'youtube' ? 'private' : 'not-embeddable'
  return 'error'
}

const str = (value: unknown) => (typeof value === 'string' && value ? value : null)

export async function fetchOEmbed(
  video: Pick<VideoRef, 'provider' | 'url'>,
  fetchFn: Fetch = fetch,
): Promise<OEmbedResult> {
  let response: Response
  try {
    response = await fetchFn(oembedUrl(video), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    return { kind: 'error', message: `oEmbed request failed: ${(error as Error).message}` }
  }
  if (!response.ok) {
    const kind = classifyStatus(video.provider, response.status)
    return kind === 'error'
      ? { kind, message: `oEmbed answered HTTP ${response.status}` }
      : { kind, httpStatus: response.status }
  }
  let body: Record<string, unknown>
  try {
    body = (await response.json()) as Record<string, unknown>
  } catch {
    return { kind: 'error', message: 'oEmbed answered something that is not JSON' }
  }
  const duration = Number(body.duration)
  return {
    kind: 'ok',
    title: str(body.title) ?? '',
    authorName: str(body.author_name),
    authorUrl: str(body.author_url),
    thumbnailUrl: str(body.thumbnail_url),
    durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
    uploadedAt: str(body.upload_date) ? new Date(String(body.upload_date)).toISOString() : null,
  }
}
