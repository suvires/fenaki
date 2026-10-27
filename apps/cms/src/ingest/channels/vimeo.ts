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
