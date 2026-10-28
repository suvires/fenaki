import { defaultLocale } from '@fenaki/i18n'
import type { APIRoute } from 'astro'
import { checkSlug } from '../../lib/account/rules.ts'
import { toCurrentShort } from '../../lib/catalog.ts'
import { listShortsBySlugs, toCardSource } from '../../lib/cms.ts'
import { localeFrom, translator } from '../../lib/i18n.ts'
import { PAGE_SIZE } from '../../lib/paging.ts'

/**
 * The current card data of some published shorts, by slug: what a page of «Mi lista» kept in the
 * browser needs to show them as the catalog has them now. Slugs left out of the answer are no
 * longer published. Public catalog data, so it may be cached.
 */
export const GET: APIRoute = async ({ url }) => {
  const locale = localeFrom(url.searchParams.get('locale') ?? defaultLocale)
  const raw = (url.searchParams.get('slugs') ?? '').split(',').filter(Boolean)
  const slugs = [...new Set(raw.map(checkSlug))]
  if (!locale || raw.length > PAGE_SIZE || slugs.includes(undefined))
    return Response.json({ error: 'invalid' }, { status: 400 })
  try {
    const t = translator(locale)
    const shorts = await listShortsBySlugs(locale, slugs as string[])
    return Response.json(
      {
        shorts: Object.fromEntries(
          shorts.map((s) => [s.slug, toCurrentShort(toCardSource(s), locale, t)]),
        ),
      },
      { headers: { 'Cache-Control': 'public, max-age=300' } },
    )
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
