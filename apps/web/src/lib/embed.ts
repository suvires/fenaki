export interface EmbedOptions {
  /**
   * The page's origin, to follow the viewer's progress: YouTube only sends its player events
   * (`enablejsapi=1`) to the origin it was told about. Without it, no events are requested.
   */
  origin?: string
  /** Start this many seconds into the short (resume). */
  start?: number
}

/** The provider's player URL. Requested only after the viewer presses play in the PlayerGate. */
export function embedUrl(
  provider: string,
  externalId: string,
  options: EmbedOptions = {},
): string | undefined {
  const id = encodeURIComponent(externalId)
  const start = options.start && options.start > 0 ? Math.floor(options.start) : 0
  switch (provider) {
    case 'youtube': {
      const params = new URLSearchParams({ autoplay: '1', rel: '0' })
      if (options.origin) {
        params.set('enablejsapi', '1')
        params.set('origin', options.origin)
      }
      if (start > 0) params.set('start', String(start))
      return `https://www.youtube-nocookie.com/embed/${id}?${params}`
    }
    case 'vimeo': {
      // Vimeo starts at `#t=…s`; its postMessage API needs nothing in the URL.
      const hash = start > 0 ? `#t=${start}s` : ''
      return `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1${hash}`
    }
    default:
      return undefined
  }
}

/** The player URL without autoplay, for structured data (`embedUrl`). */
export function embedPageUrl(provider: string, externalId: string): string | undefined {
  const src = embedUrl(provider, externalId)
  if (!src) return undefined
  const url = new URL(src)
  url.searchParams.delete('autoplay')
  return url.toString()
}
