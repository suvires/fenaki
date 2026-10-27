import type { Fetch } from '../oembed.ts'

export interface VimeoFeedItem {
  url: string
  title: string
  publishedAt: string | null
}

export interface VimeoFeed {
  title: string
  items: VimeoFeedItem[]
}

/** Vimeo has no API key here: the public RSS feed of a user or channel lists its latest videos. */
export const vimeoFeedUrl = (path: string) => `https://vimeo.com/${path}/videos/rss`

/** CDATA is literal text; anything else has XML entities. */
const decode = (text: string) => {
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(text.trim())
  if (cdata) return (cdata[1] ?? '').trim()
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

const tag = (xml: string, name: string) =>
  decode(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(xml)?.[1] ?? '')

/** Reads the items of an RSS feed. Vimeo's are flat enough for a regular expression. */
export function parseVimeoFeed(xml: string): VimeoFeed {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap((match) => {
    const body = match[1] ?? ''
    const url = tag(body, 'link')
    if (!url) return []
    const published = new Date(tag(body, 'pubDate'))
    return [
      {
        url,
        title: tag(body, 'title'),
        publishedAt: Number.isNaN(published.getTime()) ? null : published.toISOString(),
      },
    ]
  })
  const header = xml.slice(0, xml.search(/<item>|$/))
  return { title: tag(header, 'title'), items }
}

/** «Videos of Terje» / «Terje's Videos» → «Terje». */
export const feedChannelName = (title: string) =>
  title
    .replace(/^videos of\s+/i, '')
    .replace(/['’]s videos$/i, '')
    .trim()

/** Throws when the feed is not there (no such user or channel) or Vimeo fails. */
export async function fetchVimeoFeed(path: string, fetchFn: Fetch = fetch): Promise<VimeoFeed> {
  const response = await fetchFn(vimeoFeedUrl(path), {
    headers: { Accept: 'application/rss+xml, application/xml' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Vimeo feed of ${path} answered HTTP ${response.status}`)
  return parseVimeoFeed(await response.text())
}

/** One page of a user's or channel's videos, newest first. */
export interface VimeoPage {
  videos: VimeoListed[]
  /** The next page to ask for, or null at the end. */
  next: number | null
}

/** A video in a listing. Only the API listing knows more than the id. */
export interface VimeoListed {
  id: string
  /** The public address, which keeps the privacy hash of an unlisted video. */
  url: string
  publishedAt: string | null
  /** Set by the API listing, which describes the videos so oEmbed is not needed. */
  details?: VimeoDetails
}

export interface VimeoDetails {
  title: string
  description: string | null
  durationSeconds: number | null
  /** The owner allows embedding anywhere. */
  embeddable: boolean
  /** Anyone can watch it. */
  public: boolean
  /** Spoken language the owner set, ISO 639-1. */
  language: string | null
  thumbnailUrl: string | null
  authorName: string | null
  authorUrl: string | null
}

/** `terjes` → a user; `channels/x` and `groups/x` have a RSS feed and the API, but no HTML listing. */
export const isVimeoUser = (path: string) => !/^(channels|groups|album|showcase)\//i.test(path)

/** A user's public video pages paginate (`/user/videos/page:2/sort:date`); the RSS feed does not. */
export const vimeoWebPageUrl = (path: string, page: number) =>
  `https://vimeo.com/${path}/videos/page:${page}/sort:date`

/** The video links of one public listing page, in order. Empty when the page has none. */
export function parseVimeoWebPage(html: string): string[] {
  const ids = [...html.matchAll(/href="\/(\d{6,})"/g)].map((match) => match[1] ?? '')
  return [...new Set(ids)]
}

/** Reads a public listing page. Throws when Vimeo does not answer. */
export async function fetchVimeoWebPage(
  path: string,
  page: number,
  fetchFn: Fetch = fetch,
): Promise<VimeoPage> {
  const response = await fetchFn(vimeoWebPageUrl(path, page), {
    headers: { Accept: 'text/html', 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(20_000),
  })
  // Past the last page, and for a user without that listing, Vimeo answers 404 or an empty page.
  if (response.status === 404) return { videos: [], next: null }
  if (!response.ok)
    throw new Error(`Vimeo page ${page} of ${path} answered HTTP ${response.status}`)
  const ids = parseVimeoWebPage(await response.text())
  return {
    videos: ids.map((id) => ({ id, url: `https://vimeo.com/${id}`, publishedAt: null })),
    next: ids.length > 0 ? page + 1 : null,
  }
}

const API = 'https://api.vimeo.com'
const API_FIELDS = [
  'uri',
  'name',
  'description',
  'duration',
  'release_time',
  'link',
  'language',
  'privacy.embed',
  'privacy.view',
  'pictures.base_link',
  'user.name',
  'user.link',
].join(',')
export const VIMEO_PAGE_SIZE = 100

/** `terjes` → `/users/terjes/videos`, `user123` → `/users/123/videos`, `channels/x` → `/channels/x/videos`. */
export function vimeoApiPath(path: string): string {
  const numeric = /^user(\d+)$/i.exec(path)
  if (numeric) return `/users/${numeric[1]}/videos`
  return isVimeoUser(path) ? `/users/${path}/videos` : `/${path}/videos`
}

interface ApiVideo {
  uri?: string
  name?: string
  description?: string | null
  duration?: number
  release_time?: string
  link?: string
  language?: string | null
  privacy?: { embed?: string; view?: string }
  pictures?: { base_link?: string }
  user?: { name?: string; link?: string }
}

/** One page of the Vimeo API listing (needs an app access token). Throws on any HTTP error. */
export async function fetchVimeoApiPage(
  path: string,
  page: number,
  token: string,
  fetchFn: Fetch = fetch,
): Promise<VimeoPage> {
  const url = new URL(`${API}${vimeoApiPath(path)}`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', String(VIMEO_PAGE_SIZE))
  url.searchParams.set('sort', 'date')
  url.searchParams.set('direction', 'desc')
  url.searchParams.set('fields', `${API_FIELDS},paging.next`)
  const response = await fetchFn(url, {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`Vimeo API answered HTTP ${response.status}`)
  const body = (await response.json()) as { data?: ApiVideo[]; paging?: { next?: string | null } }
  const videos = (body.data ?? []).flatMap((item) => {
    const id = /\/videos\/(\d+)/.exec(item.uri ?? '')?.[1]
    if (!id) return []
    const picture = item.pictures?.base_link
    return [
      {
        id,
        url: item.link || `https://vimeo.com/${id}`,
        publishedAt: item.release_time ? new Date(item.release_time).toISOString() : null,
        details: {
          title: item.name ?? '',
          description: item.description || null,
          durationSeconds: item.duration && item.duration > 0 ? Math.round(item.duration) : null,
          embeddable: item.privacy?.embed === 'public',
          public: item.privacy?.view === 'anybody' || item.privacy?.view === 'unlisted',
          language: item.language ? (item.language.split(/[-_]/)[0]?.toLowerCase() ?? null) : null,
          thumbnailUrl: picture ? `${picture.replace(/_\d+x\d+$/, '')}_960` : null,
          authorName: item.user?.name ?? null,
          authorUrl: item.user?.link ?? null,
        },
      },
    ]
  })
  return { videos, next: body.paging?.next ? page + 1 : null }
}

/**
 * Subtitle languages of a video with an app access token: `captions` and `subtitles` tracks are
 * human work; Vimeo has no automatic tracks to list. One request per video.
 */
export async function fetchVimeoTextTracks(
  id: string,
  token: string,
  fetchFn: Fetch = fetch,
): Promise<string[]> {
  const url = new URL(`${API}/videos/${id}/texttracks`)
  url.searchParams.set('fields', 'language,type,active')
  const response = await fetchFn(url, {
    headers: { Authorization: `bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Vimeo API answered HTTP ${response.status} for the tracks`)
  const body = (await response.json()) as {
    data?: { language?: string; active?: boolean }[]
  }
  return (body.data ?? [])
    .filter((track) => track.active !== false && track.language)
    .map((track) => (track.language ?? '').split(/[-_]/)[0]?.toLowerCase() ?? '')
}
