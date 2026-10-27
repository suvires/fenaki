/** A channel URL, understood but not yet looked up. */
export type ChannelRef =
  | { provider: 'youtube'; by: 'id' | 'handle' | 'username'; value: string }
  /** `path` is `user` or `channels/slug`: the feed lives at `https://vimeo.com/<path>/videos/rss`. */
  | { provider: 'vimeo'; path: string }

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com'])

/** Vimeo paths that are not users: a video, a site section. */
const VIMEO_RESERVED = new Set([
  'channels',
  'groups',
  'categories',
  'album',
  'showcase',
  'staffpicks',
  'watch',
  'search',
  'features',
  'upload',
])

/**
 * Reads the URL of a YouTube channel (`/@handle`, `/channel/UC…`, `/user/…`) or of a Vimeo user
 * or channel (`vimeo.com/user`, `vimeo.com/channels/slug`). Undefined for anything else, video
 * links included: those belong to the «Add from a URL» box.
 */
export function parseChannelUrl(input: string): ChannelRef | undefined {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return undefined
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)
  const [first, second] = parts

  if (YOUTUBE_HOSTS.has(host)) {
    if (first?.startsWith('@') && first.length > 1)
      return { provider: 'youtube', by: 'handle', value: decodeURIComponent(first) }
    if (first === 'channel' && second && /^UC[\w-]{22}$/.test(second))
      return { provider: 'youtube', by: 'id', value: second }
    if (first === 'user' && second) return { provider: 'youtube', by: 'username', value: second }
    return undefined
  }

  if (VIMEO_HOSTS.has(host) && first) {
    if (first === 'channels') {
      return second && !/^\d+$/.test(second)
        ? { provider: 'vimeo', path: `channels/${second.toLowerCase()}` }
        : undefined
    }
    // `vimeo.com/12345` is a video; `vimeo.com/user12345` and `vimeo.com/name` are users.
    if (VIMEO_RESERVED.has(first) || /^\d+$/.test(first)) return undefined
    return { provider: 'vimeo', path: first.toLowerCase() }
  }
  return undefined
}
