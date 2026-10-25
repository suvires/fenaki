/**
 * Search engine and social metadata: canonical and alternate URLs, schema.org structured data,
 * sitemaps. Pure functions over plain data, no Astro imports, so tests can use them.
 */
import { defaultLocale, locales, type Locale } from '@fenaki/i18n'

export const absoluteUrl = (siteUrl: string, path: string) => new URL(path, siteUrl).toString()

/** `/es/cortos/x` → `/en/cortos/x`: the default alternate of a page, while slugs are shared. */
export function swapLocale(path: string, locale: Locale): string {
  return path.replace(/^\/[a-z]{2}(?=\/|$)/, `/${locale}`)
}

export type Alternates = Partial<Record<Locale, string>>

/**
 * The hreflang links of a page: one per locale it exists in, plus x-default (the default
 * locale). Pages with localized slugs pass their own paths.
 */
export function hreflangLinks(
  siteUrl: string,
  path: string,
  alternates?: Alternates,
): { hreflang: string; href: string }[] {
  const paths: Alternates =
    alternates ?? Object.fromEntries(locales.map((locale) => [locale, swapLocale(path, locale)]))
  const links: { hreflang: string; href: string }[] = locales
    .filter((locale) => paths[locale])
    .map((locale) => ({ hreflang: locale, href: absoluteUrl(siteUrl, paths[locale] as string) }))
  const fallback = paths[defaultLocale]
  if (fallback) links.push({ hreflang: 'x-default', href: absoluteUrl(siteUrl, fallback) })
  return links
}

/** ISO 8601 duration, as schema.org wants it: 652 → «PT10M52S». */
export function isoDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || (!h && !m) ? `${s}S` : ''}`
}

type JsonLd = Record<string, unknown>

const personRef = (siteUrl: string, person: { name: string; url?: string }) => ({
  '@type': 'Person',
  name: person.name,
  ...(person.url ? { url: absoluteUrl(siteUrl, person.url) } : {}),
})

export interface VideoInput {
  name: string
  description?: string | null
  url: string
  /** The generated poster image: Fenaki never uses film stills. */
  thumbnailUrl: string
  /** When the video was first published, on the provider or in Fenaki. */
  uploadDate?: string | null
  durationSeconds: number
  embedUrl?: string
  inLanguage?: string | null
  countryOfOrigin?: string | null
  year?: number | null
  directors: { name: string; url?: string }[]
  genre?: string
}

/** A short as a schema.org VideoObject, for video results. */
export function videoObject(siteUrl: string, video: VideoInput): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description || video.name,
    url: absoluteUrl(siteUrl, video.url),
    thumbnailUrl: [absoluteUrl(siteUrl, video.thumbnailUrl)],
    ...(video.uploadDate ? { uploadDate: video.uploadDate } : {}),
    duration: isoDuration(video.durationSeconds),
    ...(video.embedUrl ? { embedUrl: video.embedUrl } : {}),
    ...(video.inLanguage && video.inLanguage !== 'zxx' ? { inLanguage: video.inLanguage } : {}),
    ...(video.countryOfOrigin
      ? { countryOfOrigin: { '@type': 'Country', name: video.countryOfOrigin } }
      : {}),
    ...(video.year ? { dateCreated: String(video.year) } : {}),
    ...(video.genre ? { genre: video.genre } : {}),
    ...(video.directors.length > 0
      ? { director: video.directors.map((d) => personRef(siteUrl, d)) }
      : {}),
    isAccessibleForFree: true,
  }
}

/** An ordered list of shorts, by their page URLs. */
export function itemList(siteUrl: string, items: { name: string; url: string }[]): JsonLd {
  return {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(siteUrl, item.url),
    })),
  }
}

/** A page that is a list of shorts: a collection, a showcase or the browse page. */
export function collectionPage(
  siteUrl: string,
  page: {
    name: string
    description?: string | null
    url: string
    items: { name: string; url: string }[]
    about?: JsonLd
  },
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.name,
    ...(page.description ? { description: page.description } : {}),
    url: absoluteUrl(siteUrl, page.url),
    ...(page.about ? { about: page.about } : {}),
    mainEntity: itemList(siteUrl, page.items),
  }
}

/** A person's page: the person, and the shorts they made. */
export function profilePage(
  siteUrl: string,
  person: { name: string; url: string; description?: string | null; jobTitle?: string },
  items: { name: string; url: string }[],
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: absoluteUrl(siteUrl, person.url),
    mainEntity: {
      '@type': 'Person',
      name: person.name,
      url: absoluteUrl(siteUrl, person.url),
      ...(person.description ? { description: person.description } : {}),
      ...(person.jobTitle ? { jobTitle: person.jobTitle } : {}),
    },
    hasPart: itemList(siteUrl, items),
  }
}

/** JSON-LD inside a script tag: `<` is escaped so no string can close the tag. */
export function jsonLdScript(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export interface SitemapEntry {
  /** The page in each locale it exists in. */
  paths: Alternates
  lastModified?: string | null
}

const escapeXml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos' }[c]};`,
  )

/** One locale's sitemap, with the hreflang alternates of every page. */
export function sitemapXml(siteUrl: string, locale: Locale, entries: SitemapEntry[]): string {
  const urls = entries
    .filter((entry) => entry.paths[locale])
    .map((entry) => {
      const loc = absoluteUrl(siteUrl, entry.paths[locale] as string)
      const links = hreflangLinks(siteUrl, entry.paths[locale] as string, entry.paths)
        .map(
          (link) =>
            `<xhtml:link rel="alternate" hreflang="${link.hreflang}" href="${escapeXml(link.href)}"/>`,
        )
        .join('')
      const lastmod = entry.lastModified
        ? `<lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>`
        : ''
      return `<url><loc>${escapeXml(loc)}</loc>${lastmod}${links}</url>`
    })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`
}

/** The sitemap index: one sitemap per locale. */
export function sitemapIndexXml(siteUrl: string): string {
  const maps = locales
    .map(
      (locale) => `<sitemap><loc>${absoluteUrl(siteUrl, `/sitemap-${locale}.xml`)}</loc></sitemap>`,
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${maps}</sitemapindex>\n`
}
