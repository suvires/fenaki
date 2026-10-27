import { assess, type Assessment } from './check.ts'
import { fetchOEmbed, type Fetch, type OEmbedResult } from './oembed.ts'
import { lookupTmdb, type TmdbFilm } from './tmdb.ts'
import type { VideoRef } from './url.ts'
import { fetchYouTubeVideos, type YouTubeVideo } from './youtube.ts'

/** Optional API keys. Without them, ingestion uses the public oEmbed endpoints only. */
export interface IngestKeys {
  youtube?: string
  tmdb?: string
}

export function ingestKeys(env: Record<string, string | undefined> = process.env): IngestKeys {
  return { youtube: env.YOUTUBE_API_KEY || undefined, tmdb: env.TMDB_API_KEY || undefined }
}

export interface VideoMetadata {
  video: VideoRef
  /** The title as the provider shows it. */
  providerTitle: string
  /** The provider title without «Cortometraje completo» and quotes: the editor reviews it. */
  title: string
  channel: { name: string | null; url: string | null; externalId: string | null }
  durationSeconds: number | null
  thumbnailUrl: string | null
  uploadedAt: string | null
  originalLanguage: string | null
  assessment: Assessment
  tmdb: TmdbFilm | undefined
}

const FILLER =
  /\b(cortometraje|corto|short film|short|película|pelicula|full movie|completo|completa|oficial|official|hd|4k)\b/gi

/**
 * Drops what channels add around a short's title: «"Cuerdas", Cortometraje completo» →
 * «Cuerdas». Only leading or trailing segments made of filler words go, so a title is never cut
 * short.
 */
export function cleanTitle(raw: string): string {
  const isFiller = (segment: string) =>
    segment.replace(FILLER, '').replace(/[\s()[\]:.!"'«»“”-]/g, '') === ''
  // Segments at even positions, separators at odd ones.
  let pieces = raw.trim().split(/(\s*(?:\||–|—|·|\s-\s|,)\s*)/)
  while (pieces.length > 2 && isFiller(pieces.at(-1) ?? '')) pieces = pieces.slice(0, -2)
  while (pieces.length > 2 && isFiller(pieces[0] ?? '')) pieces = pieces.slice(2)
  const title = pieces
    .join('')
    .replace(/^["'«“”»]+|["'«“”»]+$/g, '')
    .trim()
  return title || raw.trim()
}

/** BCP 47 primary language («es-419» → «es»), as the short's original language. */
const primaryLanguage = (code: string | null | undefined) =>
  code ? (code.split('-')[0]?.toLowerCase() ?? null) : null

/** Stands in for the oEmbed answer when the YouTube Data API already described the video. */
const ASSUMED_OK: OEmbedResult = {
  kind: 'ok',
  title: '',
  authorName: null,
  authorUrl: null,
  thumbnailUrl: null,
  durationSeconds: null,
  uploadedAt: null,
}

/**
 * Turns what the providers said into the metadata a short is created from. `oembed` is left out
 * when the YouTube Data API already described the video (the channel scanner), so no request is
 * repeated.
 */
export async function buildMetadata(
  video: VideoRef,
  oembed: OEmbedResult | undefined,
  api: YouTubeVideo | null | undefined,
  keys: IngestKeys,
  fetchFn: Fetch = fetch,
): Promise<VideoMetadata> {
  const ok = oembed?.kind === 'ok' ? oembed : undefined
  const providerTitle = api?.title || ok?.title || ''
  const title = cleanTitle(providerTitle)
  const tmdb = keys.tmdb && title ? await lookupTmdb(title, null, keys.tmdb, fetchFn) : undefined
  return {
    video,
    providerTitle,
    title,
    channel: {
      name: api?.channelTitle ?? ok?.authorName ?? null,
      url:
        ok?.authorUrl ??
        (api?.channelId ? `https://www.youtube.com/channel/${api.channelId}` : null),
      externalId: api?.channelId ?? null,
    },
    durationSeconds: api?.durationSeconds ?? ok?.durationSeconds ?? tmdb?.runtimeSeconds ?? null,
    thumbnailUrl: api?.thumbnailUrl ?? ok?.thumbnailUrl ?? null,
    uploadedAt: api?.publishedAt ?? ok?.uploadedAt ?? null,
    originalLanguage: primaryLanguage(api?.audioLanguage) ?? tmdb?.originalLanguage ?? null,
    assessment: assess(oembed ?? ASSUMED_OK, api),
    tmdb,
  }
}

export async function fetchVideoMetadata(
  video: VideoRef,
  keys: IngestKeys,
  fetchFn: Fetch = fetch,
): Promise<VideoMetadata> {
  const oembed = await fetchOEmbed(video, fetchFn)
  let api: YouTubeVideo | null | undefined
  if (video.provider === 'youtube' && keys.youtube) {
    try {
      api =
        (await fetchYouTubeVideos([video.externalId], keys.youtube, fetchFn)).get(
          video.externalId,
        ) ?? null
    } catch {
      api = undefined
    }
  }
  return buildMetadata(video, oembed, api, keys, fetchFn)
}
