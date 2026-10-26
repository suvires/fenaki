import type { APIRoute } from 'astro'
import { listShowcases, listSitemapDocs } from '../lib/cms.ts'
import { LEGAL_PAGES, localeFrom, paths } from '../lib/i18n.ts'
import { sitemapXml, type SitemapEntry } from '../lib/seo.ts'
import { siteMode, siteUrl } from '../lib/services.ts'

/**
 * One locale's sitemap. Before launch it lists only the public pages (landing, sponsorship,
 * legal); with the catalog, every published short, collection, person and showcase too.
 */
export const GET: APIRoute = async ({ params }) => {
  const locale = localeFrom(params.locale)
  if (!locale) return new Response(null, { status: 404 })
  const page = (path: string, lastModified?: string | null): SitemapEntry => ({
    paths: { [locale]: path },
    lastModified,
  })
  const entries: SitemapEntry[] = [
    page(paths.home(locale)),
    page(paths.sponsor(locale)),
    ...LEGAL_PAGES.map((legal) => page(paths.legal(locale, legal))),
  ]
  if (siteMode === 'catalog') {
    const [docs, showcases] = await Promise.all([listSitemapDocs(locale), listShowcases(locale)])
    entries.push(
      page(paths.browse(locale)),
      page(paths.latest(locale)),
      ...docs.shorts.map((s) => page(paths.short(locale, s.slug), s.updatedAt)),
      ...docs.collections.map((c) => page(paths.collection(locale, c.slug), c.updatedAt)),
      ...[...docs.people].map(([slug, updatedAt]) => page(paths.person(locale, slug), updatedAt)),
      ...showcases.map((s) => page(paths.showcase(locale, s.slug), s.updatedAt)),
    )
  }
  return new Response(sitemapXml(siteUrl, locale, entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
