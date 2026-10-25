import type { APIRoute } from 'astro'
import { absoluteUrl } from '../lib/seo.ts'
import { siteUrl } from '../lib/services.ts'

/** Everything is crawlable except the APIs; the sitemap index lists the pages. */
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Disallow: /api/',
      '',
      `Sitemap: ${absoluteUrl(siteUrl, '/sitemap.xml')}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
