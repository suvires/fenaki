import type { APIRoute } from 'astro'
import { localeFrom } from '../../../lib/i18n.ts'
import { renderOgImage, ogResponse } from '../../../lib/og.ts'
import { pageCard, type OgPage } from '../../../lib/og-cards.ts'

const PAGES: OgPage[] = ['site', 'browse', 'sponsor']

/** /og/es/site.png, /og/es/browse.png, /og/es/sponsor.png. */
export const GET: APIRoute = async ({ params }) => {
  const locale = localeFrom(params.locale)
  const page = PAGES.find((p) => p === params.page)
  if (!locale || !page) return new Response(null, { status: 404 })
  return ogResponse(await renderOgImage(pageCard(locale, page)))
}
