import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createShortWithSource, type ChannelOrigin } from '../src/ingest/createShort.ts'
import { resolveChannel } from '../src/ingest/channels/resolve.ts'
import { looksLikeNonShort, skipReason, type Candidate } from '../src/ingest/channels/rules.ts'
import { runChannelScan, scanActiveChannels, scanNote } from '../src/ingest/channels/scan.ts'
import { parseChannelUrl } from '../src/ingest/channels/url.ts'
import { parseVimeoFeed } from '../src/ingest/channels/vimeo.ts'
import { listYouTubeUploadsPage } from '../src/ingest/channels/youtube.ts'
import { buildMetadata } from '../src/ingest/metadata.ts'
import {
  channel,
  fakeFetch,
  fakeRequest,
  shortsOf,
  sourcesOf,
  UC,
  vimeoFeed,
  YT,
  ytPage,
  ytChannel,
  ytVideo,
  type Doc,
} from './helpers/channels.ts'

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
  it('reads one page and hands back the token of the next', async () => {
    const { fn, calls } = fakeFetch({
      [`${YT}/playlistItems`]: {
        body: ytPage(
          [
            ['new1', '2026-10-26T10:00:00Z'],
            ['old1', '2026-10-01T10:00:00Z'],
          ],
          'tokenB',
        ),
      },
    })
    const page = await listYouTubeUploadsPage('UU1', null, 'k', fn)
    expect(page.uploads.map((upload) => upload.videoId)).toEqual(['new1', 'old1'])
    expect(page.next).toBe('tokenB')
    expect(calls[0]).toContain('maxResults=50')
    expect(calls[0]).not.toContain('pageToken')
  })

  it('continues from a page token and knows the last page', async () => {
    const { fn, calls } = fakeFetch({
      [`${YT}/playlistItems`]: { body: ytPage([['a', '2026-10-26T10:00:00Z']]) },
    })
    const page = await listYouTubeUploadsPage('UU1', 'tokenB', 'k', fn)
    expect(page.next).toBeNull()
    expect(calls[0]).toContain('pageToken=tokenB')
  })
})

const savedEnv = { ...process.env }
beforeEach(() => {
  process.env.YOUTUBE_API_KEY = 'k'
  delete process.env.TMDB_API_KEY
})
afterEach(() => {
  process.env = { ...savedEnv }
})

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
    const { req, creates, updates } = fakeRequest({
      sources: [{ provider: 'youtube', externalId: 'dupli' }],
    })

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
    const [source] = sourcesOf(creates)
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

  it('records a short that could not be saved as failed, for the next scan to retry', async () => {
    const { fn } = fakeFetch(routes([ytVideo('newone')]))
    const { req, ledger } = fakeRequest()
    const create = req.payload.create
    req.payload.create = (async (args: { collection: string }) => {
      if (args.collection === 'shorts') throw new Error('database is down')
      return create(args as never)
    }) as never
    const { scanChannel } = await import('../src/ingest/channels/scan.ts')
    const summary = await scanChannel(req, channel(), fn, 0)
    expect(summary.skipped.failed).toBe(1)
    expect(ledger.find((row) => row.externalId === 'newone')).toMatchObject({
      outcome: 'skipped',
      skipReason: 'failed',
      note: 'database is down',
    })
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
      'https://vimeo.com/terjes/videos/page:1': { body: '<html></html>' },
      'https://vimeo.com/terjes/videos/rss': {
        body: vimeoFeed([
          { id: '1001', title: 'El mar', date: 'Mon, 26 Oct 2026 10:00:00 GMT' },
          { id: '1002', title: 'Ya está', date: 'Sun, 25 Oct 2026 10:00:00 GMT' },
          { id: '1003', title: 'Clip del rodaje', date: 'Sat, 24 Oct 2026 10:00:00 GMT' },
          { id: '1004', title: 'Muy largo', date: 'Fri, 23 Oct 2026 10:00:00 GMT' },
          { id: '1005', title: 'Sin incrustar', date: 'Thu, 22 Oct 2026 10:00:00 GMT' },
        ]),
      },
      ...Object.fromEntries([
        oembed('1001', { title: 'El mar', duration: 480, author_name: 'Terje' }),
        oembed('1003', { title: 'Clip del rodaje', duration: 300 }),
        oembed('1004', { title: 'Muy largo', duration: 9000 }),
        oembed('1005', {}, 403),
      ]),
    })
    const { req, creates, updates } = fakeRequest({
      sources: [{ provider: 'vimeo', externalId: '1002' }],
    })
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
    expect(sourcesOf(creates)[0]?.data).toMatchObject({
      provider: 'vimeo',
      externalId: '1001',
      ingestChannel: 1,
    })
    expect(updates[0]?.data.lastScannedAt).toBeTypeOf('string')
  })

  it('records the videos it could not check as failed when oEmbed is down', async () => {
    const { fn } = fakeFetch({
      'https://vimeo.com/terjes/videos/page:1': { body: '<html></html>' },
      'https://vimeo.com/terjes/videos/rss': {
        body: vimeoFeed([{ id: '1001', title: 'El mar', date: 'Mon, 26 Oct 2026 10:00:00 GMT' }]),
      },
      'https://vimeo.com/api/oembed.json': { status: 503, body: 'down' },
    })
    const { req, creates, ledger } = fakeRequest()
    const { scanChannel } = await import('../src/ingest/channels/scan.ts')
    const summary = await scanChannel(req, vimeo, fn, 0)
    expect(summary).toMatchObject({ added: 0, skipped: { failed: 1 } })
    expect(shortsOf(creates)).toHaveLength(0)
    expect(ledger).toMatchObject([{ externalId: '1001', outcome: 'skipped', skipReason: 'failed' }])
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
      'https://vimeo.com/terjes/videos/page:1': { body: '<html></html>' },
      'https://vimeo.com/terjes/videos/rss': {
        body: vimeoFeed([{ id: '2001', title: 'El mar', date: 'Mon, 26 Oct 2026 10:00:00 GMT' }]),
      },
      'https://vimeo.com/api/oembed.json': { body: { title: 'El mar', duration: 480 } },
    })
    const { req, creates } = fakeRequest({
      channels: [broken as unknown as Doc, working as unknown as Doc],
    })
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
    const source = sourcesOf(creates)[0]?.data
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
        defaultLanguage: null,
        hasCaptions: false,
        description: null,
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
    expect(sourcesOf(creates)[0]?.data).toMatchObject({
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
