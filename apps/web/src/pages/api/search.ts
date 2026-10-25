import { defaultLocale } from '@shortix/i18n'
import type { APIRoute } from 'astro'
import { localeFrom } from '../../lib/i18n.ts'
import { searchShorts } from '../../lib/search.ts'

/** Search proxy: the browser never talks to Meilisearch or sees its key. */
export const GET: APIRoute = async ({ url }) => {
  const locale = localeFrom(url.searchParams.get('locale') ?? defaultLocale)
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 200)
  if (!locale) return new Response(null, { status: 400 })
  try {
    const result = await searchShorts(locale, query)
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'search_unavailable' }, { status: 503 })
  }
}
