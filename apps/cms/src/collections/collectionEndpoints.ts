import type { Endpoint } from 'payload'
import { isStaffAccount } from '../access.ts'
import { resolveCollection, type CollectionRules, type CollectionSort } from './rules.ts'

const SORTS: CollectionSort[] = ['newest', 'year', 'daily']
const sortOf = (value: unknown): CollectionSort => SORTS.find((sort) => sort === value) ?? 'newest'

const ids = (value: unknown): number[] =>
  Array.isArray(value)
    ? value
        .map((item) =>
          typeof item === 'object' && item !== null ? (item as { id: unknown }).id : item,
        )
        .filter((id): id is number => typeof id === 'number' && Number.isInteger(id))
    : []

const numberParam = (url: URL, name: string, fallback: number, max: number) => {
  const value = Number(url.searchParams.get(name))
  return Number.isInteger(value) && value >= 0 ? Math.min(value, max) : fallback
}

/**
 * GET /api/collections/:id/shorts?locale=es&offset=0&limit=20: the ids of a page of a collection
 * by filters, and how many it has. Whoever can read the collection can ask (the published ones).
 */
export const collectionShortsEndpoint: Endpoint = {
  path: '/:id/shorts',
  method: 'get',
  handler: async (req) => {
    const id = Number(req.routeParams?.id)
    const url = new URL(req.url ?? '', 'http://cms')
    const locale = url.searchParams.get('locale') ?? 'es'
    if (!Number.isInteger(id)) return Response.json({ error: 'Not found' }, { status: 404 })
    const collection = await req.payload
      .findByID({
        collection: 'collections',
        id,
        depth: 0,
        locale: locale as 'es',
        overrideAccess: false,
        req,
      })
      .catch(() => null)
    if (!collection || collection.mode !== 'rules')
      return Response.json({ error: 'Not found' }, { status: 404 })
    const page = await resolveCollection({
      locale,
      rules: collection.rules as CollectionRules,
      sort: sortOf(collection.sort),
      pinned: ids(collection.pinned),
      excluded: ids(collection.excluded),
      offset: numberParam(url, 'offset', 0, 20000),
      limit: numberParam(url, 'limit', 20, 100) || 20,
    })
    return Response.json(page, { headers: { 'Cache-Control': 'public, max-age=300' } })
  },
}

/**
 * POST /api/collections/preview: what the filters being edited would give, for the admin panel:
 * how many shorts, and the titles of the first ones. Staff only.
 */
export const collectionPreviewEndpoint: Endpoint = {
  path: '/preview',
  method: 'post',
  handler: async (req) => {
    if (!isStaffAccount(req.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const body = ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
    const page = await resolveCollection({
      locale: 'es',
      rules: (body.rules ?? {}) as CollectionRules,
      sort: sortOf(body.sort),
      pinned: ids(body.pinned),
      excluded: ids(body.excluded),
      limit: 12,
    })
    const found = await req.payload.find({
      collection: 'shorts',
      where: { id: { in: page.ids } },
      select: { title: true },
      locale: 'es',
      depth: 0,
      limit: page.ids.length,
      req,
    })
    const titles = new Map(found.docs.map((short) => [short.id, short.title]))
    return Response.json({
      total: page.total,
      titles: page.ids.flatMap((shortId) => titles.get(shortId) ?? []),
    })
  },
}
