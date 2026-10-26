import { defaultLocale } from '@fenaki/i18n'
import { cms, type Page } from '../../../lib/account/payload.ts'
import { accountRoute, fail } from '../../../lib/account/route.ts'

interface Row {
  short: { slug?: string | null; title?: string | null } | number | null
  [key: string]: unknown
}

const shortOf = (row: Row) =>
  typeof row.short === 'object' && row.short
    ? { slug: row.short.slug, title: row.short.title }
    : null

/** The member's data as one JSON file: the account, the list, the ratings, the viewings. */
export const GET = accountRoute({ limit: 'export', member: true }, async ({ member }) => {
  const query = (fields: string[]) => ({
    locale: defaultLocale,
    depth: 1,
    limit: 5000,
    'populate[shorts][slug]': true,
    'populate[shorts][title]': true,
    ...Object.fromEntries(fields.map((field) => [`select[${field}]`, true])),
  })
  const [me, list, ratings, viewings] = await Promise.all([
    cms<{ user?: { email: string; name?: string | null; createdAt?: string } }>('members/me', {
      token: member.token,
    }),
    cms<Page<Row>>('list-items', { token: member.token, query: query(['short', 'savedAt']) }),
    cms<Page<Row>>('ratings', {
      token: member.token,
      query: query(['short', 'value', 'updatedAt']),
    }),
    cms<Page<Row>>('viewings', {
      token: member.token,
      query: query(['short', 'positionSeconds', 'durationSeconds', 'completed', 'updatedAt']),
    }),
  ])
  if (me.status !== 200 || list.status !== 200 || ratings.status !== 200 || viewings.status !== 200)
    return fail('server', 503)
  const rows = (page: typeof list) =>
    (page.data?.docs ?? []).map(({ short, id: _id, ...rest }) => ({
      short: shortOf({ short }),
      ...rest,
    }))
  const body = {
    exportedAt: new Date().toISOString(),
    account: {
      email: me.data?.user?.email,
      name: me.data?.user?.name ?? null,
      createdAt: me.data?.user?.createdAt,
    },
    myList: rows(list),
    ratings: rows(ratings),
    viewings: rows(viewings),
  }
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fenaki-mis-datos.json"',
      'Cache-Control': 'no-store',
    },
  })
})
