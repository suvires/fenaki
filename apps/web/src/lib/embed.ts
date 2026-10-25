/** The provider's player URL. Requested only after the viewer presses play in the PlayerGate. */
export function embedUrl(provider: string, externalId: string): string | undefined {
  const id = encodeURIComponent(externalId)
  switch (provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
    case 'vimeo':
      return `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`
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
