import type { PayloadRequest } from 'payload'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createShortWithSource, type ChannelOrigin } from '../src/ingest/createShort.ts'
import { resolveChannel } from '../src/ingest/channels/resolve.ts'
import { looksLikeNonShort, skipReason, type Candidate } from '../src/ingest/channels/rules.ts'
import { runChannelScan, scanActiveChannels, scanNote } from '../src/ingest/channels/scan.ts'
import { parseChannelUrl } from '../src/ingest/channels/url.ts'
import { parseVimeoFeed } from '../src/ingest/channels/vimeo.ts'
import { listYouTubeUploads } from '../src/ingest/channels/youtube.ts'
import { buildMetadata } from '../src/ingest/metadata.ts'
import type { Fetch } from '../src/ingest/oembed.ts'
import type { Channel } from '../src/payload-types.ts'

const UC = 'UC1234567890abcdefghijkl'

describe('parseChannelUrl', () => {
  it.each([
    ['https://www.youtube.com/@Cuerdas', { provider: 'youtube', by: 'handle', value: '@Cuerdas' }],
    [
      'https://youtube.com/@Cuerdas/videos',
      { provider: 'youtube', by: 'handle', value: '@Cuerdas' },
    ],
    [`https://www.youtube.com/channel/${UC}`, { provider: 'youtube', by: 'id', value: UC }],
    ['https://www.youtube.com/user/ecam', { provider: 'youtube', by: 'username', value: 'ecam' }],
    ['https://vimeo.com/terjes', { provider: 'vimeo', path: 'terjes' }],
    ['https://vimeo.com/Terjes/videos', { provider: 'vimeo', path: 'terjes' }],
    ['https://vimeo.com/user12345', { provider: 'vimeo', path: 'user12345' }],
    ['https://vimeo.com/channels/shortfilms', { provider: 'vimeo', path: 'channels/shortfilms' }],
  ])('reads %s', (url, expected) => {
    expect(parseChannelUrl(url)).toEqual(expected)
  })

  it.each([
    'not a url',
    'ftp://www.youtube.com/@Cuerdas',
    'https://www.youtube.com/watch?v=4INwx_tmTKw',
    'https://www.youtube.com/channel/short',
    'https://www.youtube.com/',
    'https://vimeo.com/22439234',
    'https://vimeo.com/channels',
    'https://vimeo.com/channels/22439234',
    'https://vimeo.com/',
    'https://example.com/@Cuerdas',
  ])('rejects %s', (url) => {
    expect(parseChannelUrl(url)).toBeUndefined()
  })
})

describe('skip rules', () => {
  const filter = { minSeconds: 120, maxSeconds: 2700 }
  const ok: Candidate = {
    title: 'Cuerdas',
    durationSeconds: 600,
    embeddable: true,
    ageRestricted: false,
    status: 'ok',
  }

  it('keeps a playable short inside the duration range', () => {
    expect(skipReason(ok, filter)).toBeUndefined()
    expect(skipReason({ ...ok, durationSeconds: 120 }, filter)).toBeUndefined()
    expect(skipReason({ ...ok, durationSeconds: 2700 }, filter)).toBeUndefined()
  })

  it.each([
    [{ status: 'private' as const }, 'private'],
    [{ status: 'broken' as const }, 'unavailable'],
    [{ embeddable: false }, 'not-embeddable'],
    [{ ageRestricted: true }, 'age-restricted'],
    [{ durationSeconds: null }, 'unknown-duration'],
    [{ durationSeconds: 119 }, 'too-short'],
    [{ durationSeconds: 2701 }, 'too-long'],
    [{ title: 'Cuerdas (Tráiler oficial)' }, 'not-a-short'],
  ])('skips %j as %s', (change, reason) => {
    expect(skipReason({ ...ok, ...change }, filter)).toBe(reason)
  })

  it('uses the filters of the channel', () => {
    expect(skipReason({ ...ok, durationSeconds: 3000 }, { minSeconds: 0, maxSeconds: 3600 })).toBe(
      undefined,
    )
    expect(skipReason({ ...ok, durationSeconds: 60 }, filter)).toBe('too-short')
  })

  it.each([
    'Cuerdas - Tráiler',
    'TRAILER oficial',
    'Teaser',
    'Making of de La espera',
    'Making-of',
    'Detrás de las cámaras',
    'Behind the Scenes',
    'Clip exclusivo',
    'Avance de la película',
    'Entrevista con la directora',
    'Interview with the director',
    'Gala de premios 2026',
    'Rueda de prensa',
  ])('recognises «%s» as not a short', (title) => {
    expect(looksLikeNonShort(title)).toBe(true)
  })

  it.each([
    'Cuerdas',
    'El tráiler del abuelo no existe'.replace('tráiler', 'camión'),
    'Clipper',
    'Galaxia',
  ])('does not mistake «%s» for one', (title) => {
    expect(looksLikeNonShort(title)).toBe(false)
  })
})

describe('scanNote', () => {
  it('says what was found, added and why the rest was skipped', () => {
    expect(scanNote(5, 2, { 'too-short': 1, 'not-a-short': 2 })).toBe(
      'Found 5 new videos: 2 added, 3 skipped (1 too short, 2 trailer, clip or similar).',
    )
    expect(scanNote(1, 1, {})).toBe('Found 1 new video: 1 added.')
  })
})

/** A fetch that answers from a table of URL prefixes, and records what was asked. */
function fakeFetch(routes: Record<string, { status?: number; body?: unknown }>) {
  const calls: string[] = []
  const fn = (async (input: string | URL | Request) => {
    const url = decodeURIComponent(String(input instanceof Request ? input.url : input))
    calls.push(url)
    const match = Object.keys(routes).find((prefix) => url.startsWith(prefix))
    if (!match) throw new Error(`unexpected request ${url}`)
    const { status = 200, body = {} } = routes[match] ?? {}
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
  }) as Fetch
  return { fn, calls }
}

const YT = 'https://www.googleapis.com/youtube/v3'

const ytChannel = (id = UC) => ({
  items: [
    {
      id,
      snippet: { title: 'Cuerdas Films' },
      contentDetails: { relatedPlaylists: { uploads: 'UUuploads' } },
    },
  ],
})

const ytVideo = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  snippet: { title: `Corto ${id}`, channelId: UC, channelTitle: 'Cuerdas Films' },
  contentDetails: { duration: 'PT10M' },
  status: { embeddable: true, privacyStatus: 'public' },
  ...overrides,
})

const vimeoFeed = (items: { id: string; title: string; date: string }[]) =>
  `<?xml version="1.0"?><rss><channel><title>Terje's Videos</title>${items
    .map(
      (item) =>
        `<item><title><![CDATA[${item.title}]]></title><link>https://vimeo.com/${item.id}</link><pubDate>${item.date}</pubDate></item>`,
    )
    .join('')}</channel></rss>`

describe('channel lookup', () => {
  it('resolves a YouTube handle to its channel id and name', async () => {
    const { fn, calls } = fakeFetch({ [`${YT}/channels`]: { body: ytChannel() } })
    const resolved = await resolveChannel('https://www.youtube.com/@Cuerdas', { youtube: 'k' }, fn)
    expect(resolved).toEqual({ provider: 'youtube', externalId: UC, name: 'Cuerdas Films' })
    expect(calls[0]).toContain('forHandle=@Cuerdas')
  })

  it('needs the API key for YouTube, and knows an unknown channel', async () => {
    expect(await resolveChannel('https://www.youtube.com/@Cuerdas', {})).toEqual({
      failure: 'no-api-key',
    })
    const { fn } = fakeFetch({ [`${YT}/channels`]: { body: {} } })
    expect(await resolveChannel('https://www.youtube.com/@Nadie', { youtube: 'k' }, fn)).toEqual({
      failure: 'not-found',
    })
    expect(await resolveChannel('https://example.com', { youtube: 'k' }, fn)).toEqual({
      failure: 'invalid-url',
    })
  })

  it('resolves a Vimeo user from its feed, and reports a missing one', async () => {
    const { fn } = fakeFetch({
      'https://vimeo.com/terjes/videos/rss': { body: vimeoFeed([]) },
      'https://vimeo.com/nadie/videos/rss': { status: 404, body: 'Not found' },
    })
    expect(await resolveChannel('https://vimeo.com/terjes', {}, fn)).toEqual({
      provider: 'vimeo',
      externalId: 'terjes',
      name: 'Terje',
    })
    expect(await resolveChannel('https://vimeo.com/nadie', {}, fn)).toEqual({
      failure: 'not-found',
    })
  })
})

describe('Vimeo feed', () => {
  it('reads titles, links and dates', () => {
    const feed = parseVimeoFeed(
      vimeoFeed([{ id: '1', title: 'La espera &amp; más', date: 'Tue, 12 Apr 2011 07:31:32 GMT' }]),
    )
    expect(feed.title).toBe("Terje's Videos")
    expect(feed.items).toEqual([
      {
        url: 'https://vimeo.com/1',
        title: 'La espera &amp; más',
        publishedAt: '2011-04-12T07:31:32.000Z',
      },
    ])
  })
})

describe('YouTube uploads', () => {
  const page = (ids: [string, string][], next?: string) => ({
    nextPageToken: next,
    items: ids.map(([videoId, videoPublishedAt]) => ({
      contentDetails: { videoId, videoPublishedAt },
    })),
  })

  it('stops reading at the last scan', async () => {
    const { fn, calls } = fakeFetch({
      [`${YT}/playlistItems`]: {
        body: page(
          [
            ['new1', '2026-10-26T10:00:00Z'],
            ['old1', '2026-10-01T10:00:00Z'],
          ],
          'next',
        ),
      },
    })
    const uploads = await listYouTubeUploads('UU1', new Date('2026-10-10T00:00:00Z'), 'k', fn)
    expect(uploads.map((upload) => upload.videoId)).toEqual(['new1'])
    expect(calls).toHaveLength(1)
  })

  it('takes only the first page on the first scan', async () => {
    const { fn, calls } = fakeFetch({
      [`${YT}/playlistItems`]: { body: page([['a', '2026-10-26T10:00:00Z']], 'next') },
    })
    expect(await listYouTubeUploads('UU1', null, 'k', fn)).toHaveLength(1)
    expect(calls).toHaveLength(1)
  })
})

type Doc = Record<string, unknown> & { id: number }

/** Just enough of Payload's local API for the scanner: sources already known, creates and updates. */
function fakeRequest(known: { provider: string; externalId: string }[] = [], channels: Doc[] = []) {
  const creates: { collection: string; data: Record<string, unknown> }[] = []
  const updates: { collection: string; id: number; data: Record<string, unknown> }[] = []
  const warnings: string[] = []
  let nextId = 100
  const payload = {
    logger: { info: () => {}, warn: (message: string) => warnings.push(message) },
    find: async ({ collection, where }: { collection: string; where: Record<string, unknown> }) => {
      if (collection === 'sources') {
        const ids = (where.externalId as { in: string[] }).in
        const docs = known.filter((source) => ids.includes(source.externalId))
        return { docs, totalDocs: docs.length }
      }
      if (collection === 'licenses') return { docs: [{ id: 7 }], totalDocs: 1 }
      if (collection === 'channels') return { docs: channels, totalDocs: channels.length }
      return { docs: [], totalDocs: 0 }
    },
    count: async () => ({ totalDocs: 0 }),
    create: async (args: { collection: string; data: Record<string, unknown> }) => {
      creates.push(args)
      return { id: nextId++ }
    },
    update: async (args: { collection: string; id: number; data: Record<string, unknown> }) => {
      updates.push(args)
      return { id: args.id }
    },
  }
  return { req: { payload } as unknown as PayloadRequest, creates, updates, warnings }
}

const channel = (overrides: Partial<Channel> = {}): Channel => ({
  id: 1,
  url: 'https://www.youtube.com/@Cuerdas',
  name: 'Cuerdas Films',
  provider: 'youtube',
  externalId: UC,
  kind: 'producer',
  officialEvidence: 'Linked from cuerdas.example (checked 2026-10-27).',
  active: true,
  minDurationSeconds: 120,
  maxDurationSeconds: 2700,
  defaultLanguage: 'es',
  lastScannedAt: null,
  lastScanNote: null,
  updatedAt: '',
  createdAt: '',
  ...overrides,
})

const savedEnv = { ...process.env }
beforeEach(() => {
  process.env.YOUTUBE_API_KEY = 'k'
  delete process.env.TMDB_API_KEY
})
afterEach(() => {
  process.env = { ...savedEnv }
})

const sourceOf = (creates: { collection: string; data: Record<string, unknown> }[]) =>
  creates.filter((create) => create.collection === 'sources')
const shortsOf = (creates: { collection: string; data: Record<string, unknown> }[]) =>
  creates.filter((create) => create.collection === 'shorts')

describe('scanChannel on YouTube', () => {
  const routes = (videos: unknown[]) => ({
    [`${YT}/channels`]: { body: ytChannel() },
    [`${YT}/playlistItems`]: {
      body: {
        items: [
          { contentDetails: { videoId: 'newone', videoPublishedAt: '2026-10-26T10:00:00Z' } },
          { contentDetails: { videoId: 'dupli', videoPublishedAt: '2026-10-25T10:00:00Z' } },
          { contentDetails: { videoId: 'trail', videoPublishedAt: '2026-10-24T10:00:00Z' } },
          { contentDetails: { videoId: 'tiny', videoPublishedAt: '2026-10-23T10:00:00Z' } },
          { contentDetails: { videoId: 'noemb', videoPublishedAt: '2026-10-22T10:00:00Z' } },
          { contentDetails: { videoId: 'gone', videoPublishedAt: '2026-10-21T10:00:00Z' } },
        ],
      },
    },
    [`${YT}/videos`]: { body: { items: videos } },
  })

  it('adds the new short for review and skips the rest by reason', async () => {
    const { fn } = fakeFetch(
      routes([
        ytVideo('newone'),
        ytVideo('trail', { snippet: { title: 'Cuerdas | Tráiler', channelId: UC } }),
        ytVideo('tiny', { contentDetails: { duration: 'PT45S' } }),
        ytVideo('noemb', { status: { embeddable: false, privacyStatus: 'public' } }),
      ]),
    )
    const { req, creates, updates } = fakeRequest([{ provider: 'youtube', externalId: 'dupli' }])

    const { scanChannel } = await import('../src/ingest/channels/scan.ts')
    const summary = await scanChannel(req, channel(), fn, 0)

    expect(summary).toMatchObject({
      found: 6,
      added: 1,
      skipped: { duplicate: 1, 'not-a-short': 1, 'too-short': 1, 'not-embeddable': 1, private: 1 },
    })
    const [short] = shortsOf(creates)
    expect(short?.data).toMatchObject({
      title: 'Corto newone',
      status: 'review',
      durationSeconds: 600,
      originalLanguage: 'es',
      ingestChannel: 1,
    })
    const [source] = sourceOf(creates)
    expect(source?.data).toMatchObject({
      provider: 'youtube',
      externalId: 'newone',
      officialEvidence: 'Linked from cuerdas.example (checked 2026-10-27).',
      ingestChannel: 1,
      channel: { name: 'Cuerdas Films', kind: 'producer', externalId: UC },
    })
    expect(updates[0]?.data.lastScannedAt).toBeTypeOf('string')
    expect(updates[0]?.data.lastScanNote).toContain('Found 6 new videos: 1 added')
  })

  it('reads only what is newer than the last scan', async () => {
    const { fn, calls } = fakeFetch({
      [`${YT}/channels`]: { body: ytChannel() },
      [`${YT}/playlistItems`]: {
        body: {
          items: [
            { contentDetails: { videoId: 'newone', videoPublishedAt: '2026-10-26T10:00:00Z' } },
            { contentDetails: { videoId: 'older', videoPublishedAt: '2026-10-01T10:00:00Z' } },
          ],
        },
      },
      [`${YT}/videos`]: { body: { items: [ytVideo('newone')] } },
    })
    const { req, creates } = fakeRequest()
    const { scanChannel } = await import('../src/ingest/channels/scan.ts')
    const summary = await scanChannel(
      req,
      channel({ lastScannedAt: '2026-10-10T00:00:00Z' }),
      fn,
      0,
    )
    expect(summary).toMatchObject({ found: 1, added: 1 })
    expect(calls.find((call) => call.startsWith(`${YT}/videos`))).toContain('id=newone')
    expect(shortsOf(creates)).toHaveLength(1)
  })

  it('keeps lastScannedAt when a short could not be saved, so the next scan retries it', async () => {
    const { fn } = fakeFetch(routes([ytVideo('newone')]))
    const { req, updates } = fakeRequest()
    const create = req.payload.create
    req.payload.create = (async (args: { collection: string }) => {
      if (args.collection === 'shorts') throw new Error('database is down')
      return create(args as never)
    }) as never
    const { scanChannel } = await import('../src/ingest/channels/scan.ts')
    const summary = await scanChannel(req, channel(), fn, 0)
    expect(summary.skipped.failed).toBe(1)
    expect(updates[0]?.data).not.toHaveProperty('lastScannedAt')
  })
})

describe('scanChannel on Vimeo', () => {
  const vimeo = channel({
    provider: 'vimeo',
    url: 'https://vimeo.com/terjes',
    externalId: 'terjes',
    defaultLanguage: null,
  })
  const oembed = (id: string, body: Record<string, unknown>, status = 200) => [
    `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}`,
    { status, body },
  ]

  it('adds new videos from the feed, using oEmbed for the running time', async () => {
    const { fn } = fakeFetch({
      'https://vimeo.com/terjes/videos/rss': {
        body: vimeoFeed([
          { id: '1001', title: 'El mar', date: 'Mon, 26 Oct 2026 10:00:00 GMT' },
          { id: '1002', title: 'Ya está', date: 'Sun, 25 Oct 2026 10:00:00 GMT' },
          { id: '1003', title: 'Clip del rodaje', date: 'Sat, 24 Oct 2026 10:00:00 GMT' },
          { id: '1004', title: 'Muy largo', date: 'Fri, 23 Oct 2026 10:00:00 GMT' },
          { id: '1005', title: 'Sin incrustar', date: 'Thu, 22 Oct 2026 10:00:00 GMT' },
          { id: '1006', title: 'Viejo', date: 'Mon, 01 Jun 2026 10:00:00 GMT' },
        ]),
      },
      ...Object.fromEntries([
        oembed('1001', { title: 'El mar', duration: 480, author_name: 'Terje' }),
        oembed('1003', { title: 'Clip del rodaje', duration: 300 }),
        oembed('1004', { title: 'Muy largo', duration: 9000 }),
        oembed('1005', {}, 403),
      ]),
    })
    const { req, creates, updates } = fakeRequest([{ provider: 'vimeo', externalId: '1002' }])
    const { scanChannel } = await import('../src/ingest/channels/scan.ts')
    const summary = await scanChannel(
      req,
      { ...vimeo, lastScannedAt: '2026-10-01T00:00:00Z' },
      fn,
      0,
    )

    expect(summary).toMatchObject({
      found: 5,
      added: 1,
      skipped: { duplicate: 1, 'not-a-short': 1, 'too-long': 1, 'not-embeddable': 1 },
    })
    expect(shortsOf(creates)[0]?.data).toMatchObject({
      title: 'El mar',
      status: 'review',
      durationSeconds: 480,
    })
    expect(sourceOf(creates)[0]?.data).toMatchObject({
      provider: 'vimeo',
      externalId: '1001',
      ingestChannel: 1,
    })
    expect(updates[0]?.data.lastScannedAt).toBeTypeOf('string')
  })

  it('does not advance the scan when oEmbed is down', async () => {
    const { fn } = fakeFetch({
      'https://vimeo.com/terjes/videos/rss': {
        body: vimeoFeed([{ id: '1001', title: 'El mar', date: 'Mon, 26 Oct 2026 10:00:00 GMT' }]),
      },
      'https://vimeo.com/api/oembed.json': { status: 503, body: 'down' },
    })
    const { req, creates, updates } = fakeRequest()
    const { scanChannel } = await import('../src/ingest/channels/scan.ts')
    const summary = await scanChannel(req, vimeo, fn, 0)
    expect(summary).toMatchObject({ added: 0, skipped: { failed: 1 } })
    expect(creates).toHaveLength(0)
    expect(updates[0]?.data).not.toHaveProperty('lastScannedAt')
  })
})

describe('failing channels', () => {
  it('writes the failure on the channel and does not throw', async () => {
    const { fn } = fakeFetch({ [`${YT}/channels`]: { status: 500 } })
    const { req, updates } = fakeRequest()
    const result = await runChannelScan(req, channel(), fn, 0)
    expect(result).toEqual({ ok: false, note: 'Scan failed: YouTube Data API answered HTTP 500' })
    expect(updates[0]?.data.lastScanNote).toContain('Scan failed')
    expect(updates[0]?.data).not.toHaveProperty('lastScannedAt')
  })

  it('scans the rest when one channel fails', async () => {
    const broken = channel({ id: 1, name: 'Broken', externalId: null })
    const working = channel({ id: 2, name: 'Working', provider: 'vimeo', externalId: 'terjes' })
    const { fn } = fakeFetch({
      'https://vimeo.com/terjes/videos/rss': {
        body: vimeoFeed([{ id: '2001', title: 'El mar', date: 'Mon, 26 Oct 2026 10:00:00 GMT' }]),
      },
      'https://vimeo.com/api/oembed.json': { body: { title: 'El mar', duration: 480 } },
    })
    const { req, creates } = fakeRequest([], [broken as unknown as Doc, working as unknown as Doc])
    const summary = await scanActiveChannels(req, fn, 0)
    expect(summary).toEqual({ channels: 2, failed: 1, added: 1 })
    expect(shortsOf(creates)).toHaveLength(1)
  })
})

describe('createShortWithSource', () => {
  const video = {
    provider: 'youtube' as const,
    externalId: 'abcdefghijk',
    url: 'https://www.youtube.com/watch?v=abcdefghijk',
  }

  it('creates a short pending review with its source, as a URL does', async () => {
    const metadata = await buildMetadata(
      video,
      {
        kind: 'ok',
        title: 'Cuerdas',
        authorName: 'Canal',
        authorUrl: 'https://youtube.com/c',
        thumbnailUrl: null,
        durationSeconds: null,
        uploadedAt: null,
      },
      undefined,
      {},
    )
    const { req, creates } = fakeRequest()
    const created = await createShortWithSource(req, metadata, { origin: 'Added from a URL' })
    expect(created).toEqual({ shortId: 100, title: 'Cuerdas' })
    expect(shortsOf(creates)[0]?.data).toMatchObject({
      title: 'Cuerdas',
      slug: 'cuerdas',
      status: 'review',
    })
    expect(shortsOf(creates)[0]?.data).not.toHaveProperty('ingestChannel')
    const source = sourceOf(creates)[0]?.data
    expect(source).toMatchObject({
      short: 100,
      provider: 'youtube',
      externalId: 'abcdefghijk',
      channel: { name: 'Canal', url: 'https://youtube.com/c' },
      license: 7,
      status: 'ok',
    })
    expect(source?.checkNote).toMatch(/^Added from a URL\. Provider title: «Cuerdas»\./)
    expect(source).not.toHaveProperty('ingestChannel')
  })

  it('records the registered channel as the official one when given', async () => {
    const metadata = await buildMetadata(
      video,
      undefined,
      {
        id: 'abcdefghijk',
        title: 'Cuerdas',
        channelId: UC,
        channelTitle: 'Otro nombre',
        durationSeconds: 600,
        embeddable: true,
        privacyStatus: 'public',
        ageRestricted: false,
        publishedAt: null,
        audioLanguage: 'es-419',
        thumbnailUrl: null,
      },
      {},
    )
    const origin: ChannelOrigin = {
      id: 5,
      name: 'Cuerdas Films',
      url: 'https://www.youtube.com/@Cuerdas',
      externalId: UC,
      kind: 'festival',
      officialEvidence: 'Evidence',
    }
    const { req, creates } = fakeRequest()
    await createShortWithSource(req, metadata, {
      origin: 'Added by a scan',
      channel: origin,
      defaultLanguage: 'ca',
    })
    expect(shortsOf(creates)[0]?.data).toMatchObject({ ingestChannel: 5, originalLanguage: 'es' })
    expect(sourceOf(creates)[0]?.data).toMatchObject({
      ingestChannel: 5,
      officialEvidence: 'Evidence',
      channel: {
        name: 'Cuerdas Films',
        kind: 'festival',
        url: 'https://www.youtube.com/@Cuerdas',
        externalId: UC,
      },
    })
  })
})
