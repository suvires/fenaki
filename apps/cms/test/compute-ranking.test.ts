import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'
import type { Fetch } from '../src/ingest/oembed.ts'
import { computeRanking, rankShorts } from '../src/jobs/computeRanking.ts'
import { fetchPlays, umamiConfig, type UmamiConfig } from '../src/ranking/umami.ts'

const config: UmamiConfig = {
  url: 'http://umami.test/',
  websiteId: 'site-1',
  username: 'admin',
  password: 'secret',
}

/** Umami answering the login and one event-data request with the given rows, or a failure. */
function umami(rows: { value: string; total: number }[] | number): {
  fetchFn: Fetch
  urls: string[]
} {
  const urls: string[] = []
  const fetchFn: Fetch = async (input) => {
    const url = String(input)
    urls.push(url)
    if (url.endsWith('/api/auth/login')) return Response.json({ token: 'jwt' })
    return typeof rows === 'number' ? new Response('boom', { status: rows }) : Response.json(rows)
  }
  return { fetchFn, urls }
}

type Doc = Record<string, unknown> & { id: number }

function fakeRequest(shorts: Doc[]) {
  const writes: Record<string, unknown>[] = []
  const finds: Record<string, unknown>[] = []
  const payload = {
    find: async (args: Record<string, unknown>) => {
      finds.push(args)
      return { docs: shorts.filter((short) => short.status === 'published') }
    },
    updateGlobal: async (args: { slug: string; data: Record<string, unknown> }) => {
      writes.push(args.data)
      return args.data
    },
  }
  return { req: { payload } as unknown as PayloadRequest, writes, finds }
}

const short = (id: number, slug: string, publishedAt: string, status = 'published'): Doc => ({
  id,
  slug: { es: slug },
  publishedAt,
  status,
})

describe('rankShorts', () => {
  const shorts = [
    { id: 1, slugs: ['a'], publishedAt: '2026-01-01T00:00:00Z' },
    { id: 2, slugs: ['b'], publishedAt: '2026-02-01T00:00:00Z' },
    { id: 3, slugs: ['c'], publishedAt: '2026-03-01T00:00:00Z' },
    { id: 4, slugs: ['d'], publishedAt: '2026-04-01T00:00:00Z' },
  ]

  it('orders by plays and breaks ties with the most recent publication', () => {
    const plays = new Map([
      ['a', 5],
      ['b', 9],
      ['c', 5],
      ['d', 1],
    ])
    expect(rankShorts(plays, shorts)).toEqual([2, 3, 1, 4])
  })

  it('leaves out shorts nobody played and slugs that are not published', () => {
    const plays = new Map([
      ['a', 2],
      ['ghost', 50],
    ])
    expect(rankShorts(plays, shorts)).toEqual([1])
  })

  it('keeps at most the requested size', () => {
    const plays = new Map(shorts.map((s) => [s.slugs.join(), s.id]))
    expect(rankShorts(plays, shorts, 2)).toEqual([4, 3])
  })

  it('adds the plays of every locale slug of the same short', () => {
    const plays = new Map([
      ['hola', 2],
      ['hello', 2],
      ['x', 3],
    ])
    const both = [
      { id: 1, slugs: ['hola', 'hello'], publishedAt: null },
      { id: 2, slugs: ['x'], publishedAt: null },
    ]
    expect(rankShorts(plays, both)).toEqual([1, 2])
  })
})

describe('fetchPlays', () => {
  it('logs in, asks for the play event by short and totals the rows per slug', async () => {
    const { fetchFn, urls } = umami([
      { value: 'a', total: 3 },
      { value: 'b', total: 1 },
    ])
    const plays = await fetchPlays(config, { startAt: 10, endAt: 20 }, fetchFn)
    expect(Object.fromEntries(plays)).toEqual({ a: 3, b: 1 })
    expect(urls[1]).toBe(
      'http://umami.test/api/websites/site-1/event-data/values?startAt=10&endAt=20&event=play&propertyName=short',
    )
  })

  it('throws when Umami refuses', async () => {
    await expect(fetchPlays(config, { startAt: 0, endAt: 1 }, umami(503).fetchFn)).rejects.toThrow(
      /503/,
    )
    const noLogin: Fetch = async () => new Response('no', { status: 401 })
    await expect(fetchPlays(config, { startAt: 0, endAt: 1 }, noLogin)).rejects.toThrow(/login/)
  })
})

describe('umamiConfig', () => {
  it('needs the URL, the website and the password', () => {
    expect(umamiConfig({})).toBeUndefined()
    expect(
      umamiConfig({ UMAMI_URL: 'http://u', UMAMI_WEBSITE_ID: 'w', UMAMI_PASSWORD: 'p' }),
    ).toEqual({ url: 'http://u', websiteId: 'w', username: 'admin', password: 'p' })
  })
})

describe('computeRanking', () => {
  const now = new Date('2026-10-26T04:00:00Z')

  it('stores the most played published shorts with the window they were counted in', async () => {
    const { req, writes } = fakeRequest([
      short(1, 'a', '2026-01-01T00:00:00Z'),
      short(2, 'b', '2026-02-01T00:00:00Z'),
      short(3, 'draft', '2026-03-01T00:00:00Z', 'draft'),
    ])
    const { fetchFn } = umami([
      { value: 'a', total: 2 },
      { value: 'b', total: 7 },
      { value: 'draft', total: 99 },
    ])
    const summary = await computeRanking(req, fetchFn, now, config)
    expect(summary).toEqual({ skipped: false, ranked: 2 })
    expect(writes).toEqual([
      {
        shorts: [2, 1],
        computedAt: '2026-10-26T04:00:00.000Z',
        windowStart: '2026-10-19T04:00:00.000Z',
        windowEnd: '2026-10-26T04:00:00.000Z',
      },
    ])
  })

  it('counts only published shorts, in every locale', async () => {
    const { req, finds } = fakeRequest([])
    await computeRanking(req, umami([]).fetchFn, now, config)
    expect(finds[0]).toMatchObject({
      collection: 'shorts',
      where: { status: { equals: 'published' } },
      locale: 'all',
    })
  })

  it('leaves the previous ranking untouched when Umami fails', async () => {
    const { req, writes } = fakeRequest([short(1, 'a', '2026-01-01T00:00:00Z')])
    await expect(computeRanking(req, umami(500).fetchFn, now, config)).rejects.toThrow(/500/)
    expect(writes).toEqual([])
  })

  it('does nothing without Umami configured', async () => {
    const { req, writes } = fakeRequest([])
    const never: Fetch = async () => {
      throw new Error('no requests expected')
    }
    expect(await computeRanking(req, never, now, null)).toEqual({ skipped: true, ranked: 0 })
    expect(writes).toEqual([])
  })
})
