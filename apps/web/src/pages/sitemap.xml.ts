import type { APIRoute } from 'astro'
import { sitemapIndexXml } from '../lib/seo.ts'
import { siteUrl } from '../lib/services.ts'

/** The sitemap index: one sitemap per locale. */
export const GET: APIRoute = () =>
  new Response(sitemapIndexXml(siteUrl), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
