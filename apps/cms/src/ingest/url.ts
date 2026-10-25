/** A video on a provider we embed from, recognised from any of its public URLs. */
export interface VideoRef {
  provider: 'youtube' | 'vimeo'
  externalId: string
  /** The public page of the video, the form the oEmbed endpoints expect. */
  url: string
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Reads a YouTube or Vimeo URL: watch pages, short links, embeds, Shorts and unlisted Vimeo
 * links (whose privacy hash is part of the id, `123456/abcdef`). Undefined for anything else.
 */
export function parseVideoUrl(input: string): VideoRef | undefined {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return undefined
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)

  let youtubeId: string | undefined
  if (host === 'youtu.be') youtubeId = parts[0]
  else if (YOUTUBE_HOSTS.has(host)) {
    if (parts[0] === 'watch') youtubeId = url.searchParams.get('v') ?? undefined
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) youtubeId = parts[1]
  }
  if (youtubeId !== undefined) {
    if (!YOUTUBE_ID.test(youtubeId)) return undefined
    return {
      provider: 'youtube',
      externalId: youtubeId,
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
    }
  }

  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    // vimeo.com/123, vimeo.com/123/hash, vimeo.com/channels/x/123, player.vimeo.com/video/123?h=hash
    const index = parts.findIndex((part) => /^\d+$/.test(part))
    const id = parts[index]
    if (!id) return undefined
    const next = parts[index + 1]
    const hash = url.searchParams.get('h') ?? (next && /^[0-9a-f]{6,}$/i.test(next) ? next : null)
    return {
      provider: 'vimeo',
      externalId: hash ? `${id}/${hash}` : id,
      url: hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`,
    }
  }
  return undefined
}

/** The public page of a source, rebuilt from its provider and id. */
export function videoPageUrl(provider: string, externalId: string): string | undefined {
  if (provider === 'youtube') return `https://www.youtube.com/watch?v=${externalId}`
  if (provider === 'vimeo') return `https://vimeo.com/${externalId}`
  return undefined
}
