import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scanChannel } from '../src/ingest/channels/scan.ts'
import { skipReason, type Candidate } from '../src/ingest/channels/rules.ts'
import { fetchVimeoApiPage, parseVimeoWebPage, vimeoApiPath } from '../src/ingest/channels/vimeo.ts'
import {
  inCatalogLanguage,
  noLanguages,
  shortLanguageFields,
  withDefaultLanguage,
  youtubeLanguages,
} from '../src/ingest/languages.ts'
import { toYouTubeVideo } from '../src/ingest/youtube.ts'
import {
  channel,
  fakeFetch,
  fakeRequest,
  shortsOf,
  UC,
  vimeoFeed,
  vimeoWebPage,
  YT,
  ytChannel,
  ytPage,
  ytVideo,
  type Doc,
} from './helpers/channels.ts'

const savedEnv = { ...process.env }
beforeEach(() => {
  process.env.YOUTUBE_API_KEY = 'k'
  delete process.env.TMDB_API_KEY
  delete process.env.VIMEO_ACCESS_TOKEN
  delete process.env.ANTHROPIC_API_KEY
})
afterEach(() => {
  process.env = { ...savedEnv }
})

const spoken = (...codes: string[]) => ({ ...noLanguages(), spoken: codes })

describe('languages', () => {
  it('accepts Spanish, no dialogue, and any language when nobody said', () => {
    expect(inCatalogLanguage(spoken('es'), ['es'])).toBe(true)
    expect(inCatalogLanguage(spoken('zxx'), ['es'])).toBe(true)
    expect(inCatalogLanguage(spoken(), ['es'])).toBe(true)
    expect(inCatalogLanguage(spoken('en', 'es'), ['es'])).toBe(true)
  })

  it('rejects another language unless it has subtitles in a catalog language', () => {
    expect(inCatalogLanguage(spoken('en'), ['es'])).toBe(false)
    expect(inCatalogLanguage({ ...spoken('en'), subtitles: ['es'] }, ['es'])).toBe(true)
    expect(inCatalogLanguage({ ...spoken('en'), autoSubtitles: ['es-419'] }, ['es'])).toBe(true)
    expect(inCatalogLanguage({ ...spoken('en'), subtitles: ['fr'] }, ['es'])).toBe(false)
  })

  it('lets through a foreign video the provider says has captions, without their language', () => {
    expect(inCatalogLanguage({ ...spoken('en'), hasCaptions: true }, ['es'])).toBe(true)
    expect(inCatalogLanguage({ ...spoken('en'), hasCaptions: false }, ['es'])).toBe(false)
  })

  it('follows the catalog languages setting', () => {
    expect(inCatalogLanguage(spoken('en'), ['es', 'en'])).toBe(true)
    expect(inCatalogLanguage(spoken('fr'), ['es', 'en'])).toBe(false)
  })

  it('falls back to the channel language and remembers that it did', () => {
    expect(withDefaultLanguage(noLanguages(), 'es-ES')).toMatchObject({
      spoken: ['es'],
      source: 'channel',
    })
    const known = { ...spoken('en'), source: 'provider' as const }
    expect(withDefaultLanguage(known, 'es')).toBe(known)
    expect(withDefaultLanguage(noLanguages(), null).spoken).toEqual([])
  })

  it('reads the YouTube audio language first, then the metadata language', () => {
    const video = (snippet: Record<string, unknown>, caption?: string) =>
      toYouTubeVideo({
        id: 'a',
        snippet: { title: 'T', ...snippet },
        contentDetails: { caption },
      })
    expect(
      youtubeLanguages(video({ defaultAudioLanguage: 'en-US', defaultLanguage: 'es' })),
    ).toMatchObject({ spoken: ['en'], source: 'provider', hasCaptions: false })
    expect(youtubeLanguages(video({ defaultLanguage: 'es-419' }, 'true'))).toMatchObject({
      spoken: ['es'],
      hasCaptions: true,
    })
    expect(youtubeLanguages(video({}))).toMatchObject({ spoken: [], source: null })
  })

  it('maps the spoken languages to the short fields', () => {
    expect(shortLanguageFields(['es', 'en'])).toEqual({
      originalLanguage: 'es',
      otherLanguages: ['en'],
      noDialogue: false,
    })
    expect(shortLanguageFields(['zxx'])).toEqual({
      originalLanguage: 'zxx',
      otherLanguages: [],
      noDialogue: true,
    })
    expect(shortLanguageFields([])).toMatchObject({ originalLanguage: null, noDialogue: false })
  })

  it('has its own skip reason', () => {
    const candidate: Candidate = {
      title: 'Strings',
      durationSeconds: 600,
      embeddable: true,
      ageRestricted: false,
      status: 'ok',
      languages: spoken('en'),
    }
    const filter = { minSeconds: 120, maxSeconds: 2700 }
    expect(skipReason(candidate, filter)).toBe('not-in-catalog-language')
    expect(skipReason(candidate, filter, ['es', 'en'])).toBeUndefined()
  })
})

describe('YouTube backlog', () => {
  const ids = (prefix: string, count: number): [string, string][] =>
    Array.from({ length: count }, (_, i) => [`${prefix}${i}`, '2026-10-01T10:00:00Z'])

  /** Three pages of three videos; every video is an ordinary playable short. */
  const catalogue = () => {
    const pages: Record<string, ReturnType<typeof ytPage>> = {
      '': ytPage(ids('a', 3), 'p2'),
      p2: ytPage(ids('b', 3), 'p3'),
      p3: ytPage(ids('c', 3)),
    }
    const routes = {
      [`${YT}/channels`]: { body: ytChannel() },
      [`${YT}/videos`]: { body: { items: [] as unknown[] } },
    }
    const fn = fakeFetch(routes)
    const original = fn.fn
    // The listing answers by page token; videos.list by the ids asked.
    fn.fn = (async (input: string | URL | Request) => {
      const url = new URL(String(input instanceof Request ? input.url : input))
      if (url.pathname.endsWith('/playlistItems')) {
        fn.calls.push(`list:${url.searchParams.get('pageToken') ?? ''}`)
        return new Response(JSON.stringify(pages[url.searchParams.get('pageToken') ?? ''] ?? {}))
      }
      if (url.pathname.endsWith('/videos')) {
        const wanted = (url.searchParams.get('id') ?? '').split(',')
        fn.calls.push(`videos:${wanted.join(',')}`)
        return new Response(JSON.stringify({ items: wanted.map((id) => ytVideo(id)) }))
      }
      return original(input)
    }) as typeof fn.fn
    return fn
  }

  it('reads the whole history on the first scan, not the latest 50', async () => {
    const { fn } = catalogue()
    const { req, creates, updates } = fakeRequest()
    const summary = await scanChannel(req, channel({ backlogComplete: false }), fn, 0)
    expect(summary).toMatchObject({ found: 9, added: 9, complete: true })
    expect(shortsOf(creates)).toHaveLength(9)
    expect(updates.at(-1)?.data).toMatchObject({ backlogComplete: true, backlogCursor: null })
  })

  it('stops at the per-run cap and resumes where it stopped', async () => {
    const { fn, calls } = catalogue()
    const { req, creates, updates, ledger } = fakeRequest()

    const first = await scanChannel(req, channel({ backlogComplete: false }), fn, 0, {
      maxVideos: 4,
    })
    expect(first).toMatchObject({ found: 6, added: 6, complete: false })
    expect(first.note).toContain('continues in the next scan')
    expect(updates.at(-1)?.data).toMatchObject({ backlogComplete: false, backlogCursor: 'p3' })

    calls.length = 0
    const second = await scanChannel(
      req,
      channel({ backlogComplete: false, backlogCursor: 'p3' }),
      fn,
      0,
      { maxVideos: 4 },
    )
    expect(second).toMatchObject({ found: 3, added: 3, complete: true })
    expect(calls.filter((call) => call.startsWith('videos:'))).toEqual(['videos:c0,c1,c2'])
    expect(shortsOf(creates)).toHaveLength(9)
    expect(ledger).toHaveLength(9)
    expect(updates.at(-1)?.data).toMatchObject({ backlogComplete: true, backlogCursor: null })
  })

  it('starts over when the saved position is no longer valid', async () => {
    const { fn: base } = catalogue()
    const inner = base
    const stale = (async (input: string | URL | Request) => {
      const url = new URL(String(input instanceof Request ? input.url : input))
      if (url.searchParams.get('pageToken') === 'gone') return new Response('{}', { status: 400 })
      return inner(input)
    }) as typeof base
    const { req } = fakeRequest()
    const summary = await scanChannel(
      req,
      channel({ backlogComplete: false, backlogCursor: 'gone' }),
      stale,
      0,
    )
    expect(summary).toMatchObject({ added: 9, complete: true })
  })

  it('does no work twice: the ledger settles what a second scan meets', async () => {
    const { fn, calls } = catalogue()
    const { req, creates, ledger } = fakeRequest()
    await scanChannel(req, channel({ backlogComplete: false }), fn, 0)
    expect(ledger.map((row) => row.outcome)).toEqual(Array(9).fill('added'))
    calls.length = 0

    const again = await scanChannel(req, channel({ backlogComplete: false }), fn, 0)
    expect(again).toMatchObject({ found: 0, added: 0 })
    expect(calls.filter((call) => call.startsWith('videos:'))).toEqual([])
    expect(shortsOf(creates)).toHaveLength(9)
  })

  it('stops at the first page it already knows once the backlog is read', async () => {
    const { fn, calls } = catalogue()
    const known: Doc[] = ['a0', 'a1', 'a2'].map((externalId, i) => ({
      id: i + 1,
      provider: 'youtube',
      externalId,
      outcome: 'added',
      channel: 1,
    }))
    const { req } = fakeRequest({ ledger: known })
    const summary = await scanChannel(req, channel({ backlogComplete: true }), fn, 0)
    expect(summary).toMatchObject({ found: 0, complete: true })
    expect(calls.filter((call) => call.startsWith('list:'))).toEqual(['list:'])
  })

  it('keeps a channel flagged «Revisar todo el canal» on the full walk, and clears the flag', async () => {
    const { fn } = catalogue()
    const { req, updates } = fakeRequest()
    await scanChannel(req, channel({ backlogComplete: true, rescanAll: true }), fn, 0)
    expect(updates.at(-1)?.data).toMatchObject({ backlogComplete: true, rescanAll: false })
  })

  it('records what it learned about already-catalogued videos without touching them', async () => {
    const { fn, calls } = catalogue()
    const { req, creates, ledger } = fakeRequest({
      sources: [{ provider: 'youtube', externalId: 'a0', short: 42 }],
    })
    const summary = await scanChannel(req, channel({ backlogComplete: false }), fn, 0)
    expect(summary.skipped.duplicate).toBe(1)
    expect(ledger.find((row) => row.externalId === 'a0')).toMatchObject({
      outcome: 'added',
      short: 42,
    })
    expect(calls.find((call) => call.startsWith('videos:a'))).not.toContain('a0')
    expect(shortsOf(creates)).toHaveLength(8)
  })
})

describe('AI review of new shorts', () => {
  const channelRoutes = (count: number) => {
    const ids = Array.from({ length: count }, (_, i) => `v${i}`)
    return fakeFetch({
      [`${YT}/channels`]: { body: ytChannel() },
      [`${YT}/playlistItems`]: {
        body: ytPage(ids.map((id) => [id, '2026-10-26T10:00:00Z'])),
      },
      [`${YT}/videos`]: { body: { items: ids.map((id) => ytVideo(id)) } },
    })
  }

  it('queues one review per short added, when there is a key, automatic review is on and only a few', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    process.env.AI_REVIEW_AUTO = 'on'
    const { fn } = channelRoutes(3)
    const { req, queued } = fakeRequest()
    await scanChannel(req, channel(), fn, 0)
    expect(queued.map((job) => job.task)).toEqual(['reviewShort', 'reviewShort', 'reviewShort'])
    delete process.env.AI_REVIEW_AUTO
  })

  it('queues nothing while automatic review is off', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    const { fn } = channelRoutes(3)
    const { req, queued } = fakeRequest()
    await scanChannel(req, channel(), fn, 0)
    expect(queued).toEqual([])
  })

  it('leaves a big haul to the nightly batch', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    const { fn } = channelRoutes(11)
    const { req, queued } = fakeRequest()
    const summary = await scanChannel(req, channel(), fn, 0)
    expect(summary.added).toBe(11)
    expect(queued).toEqual([])
  })

  it('queues nothing without a key', async () => {
    const { fn } = channelRoutes(2)
    const { req, queued } = fakeRequest()
    await scanChannel(req, channel(), fn, 0)
    expect(queued).toEqual([])
  })
})

describe('ledger retries', () => {
  const routes = (videos: unknown[]) => ({
    [`${YT}/channels`]: { body: ytChannel() },
    [`${YT}/playlistItems`]: { body: ytPage([['fresh', '2026-10-26T10:00:00Z']]) },
    [`${YT}/videos`]: { body: { items: videos } },
  })

  it('retries failed videos whatever their age, and the ones an editor asked about', async () => {
    const { fn, calls } = fakeFetch(routes([ytVideo('fresh'), ytVideo('flaky'), ytVideo('short')]))
    const rows: Doc[] = [
      {
        id: 1,
        provider: 'youtube',
        externalId: 'flaky',
        outcome: 'skipped',
        skipReason: 'failed',
        channel: 1,
        url: 'https://www.youtube.com/watch?v=flaky',
      },
      {
        id: 2,
        provider: 'youtube',
        externalId: 'short',
        outcome: 'skipped',
        skipReason: 'too-short',
        reevaluate: true,
        channel: 1,
      },
      {
        id: 3,
        provider: 'youtube',
        externalId: 'settled',
        outcome: 'skipped',
        skipReason: 'too-long',
        channel: 1,
      },
    ]
    const { req, creates, ledger } = fakeRequest({ ledger: rows })
    const summary = await scanChannel(req, channel(), fn, 0)

    expect(summary).toMatchObject({ found: 3, added: 3 })
    expect(shortsOf(creates).map((create) => create.data.title)).toEqual(
      expect.arrayContaining(['Corto flaky', 'Corto short', 'Corto fresh']),
    )
    expect(ledger.find((row) => row.externalId === 'flaky')).toMatchObject({
      outcome: 'added',
      reevaluate: false,
    })
    expect(ledger.find((row) => row.externalId === 'short')).toMatchObject({
      outcome: 'added',
      reevaluate: false,
    })
    // The settled row was neither fetched nor judged.
    expect(calls.join('\n')).not.toContain('settled')
    expect(ledger.find((row) => row.externalId === 'settled')).toMatchObject({
      skipReason: 'too-long',
    })
  })

  it('judges a re-evaluated video with the current rules', async () => {
    const { fn } = fakeFetch(
      routes([ytVideo('fresh'), ytVideo('long', { contentDetails: { duration: 'PT50M' } })]),
    )
    const row: Doc = {
      id: 1,
      provider: 'youtube',
      externalId: 'long',
      outcome: 'skipped',
      skipReason: 'too-long',
      reevaluate: true,
      channel: 1,
    }
    const { req, ledger } = fakeRequest({ ledger: [row] })
    // Still too long for a 45 minute limit…
    const strict = await scanChannel(req, channel(), fn, 0)
    expect(strict.skipped['too-long']).toBe(1)
    expect(ledger.find((r) => r.externalId === 'long')).toMatchObject({
      skipReason: 'too-long',
      reevaluate: false,
    })

    // …and in after the editor widened the range and asked again.
    const longRow = ledger.find((r) => r.externalId === 'long')
    if (longRow) longRow.reevaluate = true
    const wide = await scanChannel(req, channel({ maxDurationSeconds: 7200 }), fn, 0)
    expect(wide.added).toBe(1)
    expect(ledger.find((r) => r.externalId === 'long')).toMatchObject({ outcome: 'added' })
  })
})

describe('catalog languages', () => {
  const routes = (api: Record<string, unknown>) => ({
    [`${YT}/channels`]: { body: ytChannel() },
    [`${YT}/playlistItems`]: { body: ytPage([['talk', '2026-10-26T10:00:00Z']]) },
    [`${YT}/videos`]: {
      body: {
        items: [
          ytVideo('talk', {
            snippet: { title: 'Strings', channelId: UC, defaultAudioLanguage: 'en-US' },
            ...api,
          }),
        ],
      },
    },
  })

  it('leaves a video spoken in another language in the ledger, with its language', async () => {
    const { fn } = fakeFetch(routes({}))
    const { req, creates, ledger } = fakeRequest()
    const summary = await scanChannel(req, channel(), fn, 0)
    expect(summary.skipped['not-in-catalog-language']).toBe(1)
    expect(shortsOf(creates)).toHaveLength(0)
    expect(ledger[0]).toMatchObject({
      outcome: 'skipped',
      skipReason: 'not-in-catalog-language',
      spokenLanguages: ['en'],
      languageSource: 'provider',
      captions: 'no',
      title: 'Strings',
    })
  })

  it('takes it when a catalog language is enabled, and records the languages on the short', async () => {
    const { fn } = fakeFetch(routes({}))
    const { req, creates } = fakeRequest({ catalogLanguages: ['es', 'en'] })
    const summary = await scanChannel(req, channel(), fn, 0)
    expect(summary.added).toBe(1)
    expect(shortsOf(creates)[0]?.data).toMatchObject({
      originalLanguage: 'en',
      otherLanguages: [],
      languageSource: 'provider',
    })
  })

  it('takes a foreign video the provider says has captions', async () => {
    const { fn } = fakeFetch(routes({ contentDetails: { duration: 'PT10M', caption: 'true' } }))
    const { req, creates } = fakeRequest()
    const summary = await scanChannel(req, channel(), fn, 0)
    expect(summary.added).toBe(1)
    expect(sourceData(creates)).toMatchObject({ captions: 'yes', subtitlesSource: 'provider' })
  })

  it('uses the channel language when the provider says nothing, and says so', async () => {
    const { fn } = fakeFetch({
      [`${YT}/channels`]: { body: ytChannel() },
      [`${YT}/playlistItems`]: { body: ytPage([['plain', '2026-10-26T10:00:00Z']]) },
      [`${YT}/videos`]: { body: { items: [ytVideo('plain')] } },
    })
    const { req, creates } = fakeRequest()
    await scanChannel(req, channel({ defaultLanguage: 'es' }), fn, 0)
    expect(shortsOf(creates)[0]?.data).toMatchObject({
      originalLanguage: 'es',
      languageSource: 'channel',
    })
  })

  it('keeps the provider description for the editor and the AI review', async () => {
    const { fn } = fakeFetch(routes({}))
    const { req, creates } = fakeRequest({ catalogLanguages: ['en'] })
    await scanChannel(req, channel(), fn, 0)
    expect(sourceData(creates)).toHaveProperty('providerDescription')
  })
})

const sourceData = (creates: { collection: string; data: Record<string, unknown> }[]) =>
  creates.find((create) => create.collection === 'sources')?.data

describe('Vimeo listings', () => {
  const vimeo = channel({
    provider: 'vimeo',
    url: 'https://vimeo.com/esdip',
    externalId: 'esdip',
    defaultLanguage: null,
    backlogComplete: false,
  })
  const oembed = (id: string, duration = 400) => [
    `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}`,
    { body: { title: `Corto ${id}`, duration, author_name: 'ESDIP' } },
  ]

  it('reads the video links of a public page, once each', () => {
    expect(parseVimeoWebPage(vimeoWebPage(['1051957955', '1051961871']))).toEqual([
      '1051957955',
      '1051961871',
    ])
    expect(parseVimeoWebPage('<a href="/log_in">x</a><a href="/12">short</a>')).toEqual([])
  })

  it('walks a user’s public pages to the end without a token', async () => {
    const { fn, calls } = fakeFetch({
      'https://vimeo.com/esdip/videos/page:1/sort:date': {
        body: vimeoWebPage(['1000001', '1000002']),
      },
      'https://vimeo.com/esdip/videos/page:2/sort:date': { body: vimeoWebPage(['1000003']) },
      'https://vimeo.com/esdip/videos/page:3/sort:date': { status: 404, body: 'Not found' },
      ...Object.fromEntries([oembed('1000001'), oembed('1000002'), oembed('1000003')]),
    })
    const { req, creates } = fakeRequest()
    const summary = await scanChannel(req, vimeo, fn, 0)
    expect(summary).toMatchObject({ found: 3, added: 3, complete: true })
    expect(shortsOf(creates).map((create) => create.data.title)).toEqual([
      'Corto 1000001',
      'Corto 1000002',
      'Corto 1000003',
    ])
    expect(calls.filter((call) => call.includes('/page:'))).toHaveLength(3)
  })

  it('falls back to the RSS feed for a channel, which has no public pages', async () => {
    const { fn, calls } = fakeFetch({
      'https://vimeo.com/channels/shorts/videos/rss': {
        body: vimeoFeed([
          { id: '2000001', title: 'El mar', date: 'Mon, 26 Oct 2026 10:00:00 GMT' },
        ]),
      },
      ...Object.fromEntries([oembed('2000001')]),
    })
    const { req } = fakeRequest()
    const summary = await scanChannel(
      req,
      { ...vimeo, externalId: 'channels/shorts', url: 'https://vimeo.com/channels/shorts' },
      fn,
      0,
    )
    expect(summary.added).toBe(1)
    expect(calls.some((call) => call.includes('/page:'))).toBe(false)
  })

  it('maps users and channels to API paths', () => {
    expect(vimeoApiPath('esdip')).toBe('/users/esdip/videos')
    expect(vimeoApiPath('user12345')).toBe('/users/12345/videos')
    expect(vimeoApiPath('channels/shorts')).toBe('/channels/shorts/videos')
  })

  const apiVideo = (id: string, extra: Record<string, unknown> = {}) => ({
    uri: `/videos/${id}`,
    name: `Corto ${id}`,
    description: 'Una descripción',
    duration: 480,
    release_time: '2026-10-20T10:00:00+00:00',
    link: `https://vimeo.com/${id}`,
    language: 'es',
    privacy: { embed: 'public', view: 'anybody' },
    pictures: { base_link: `https://i.vimeocdn.com/video/${id}_640x360` },
    user: { name: 'ESDIP', link: 'https://vimeo.com/esdip' },
    ...extra,
  })

  it('lists the whole catalogue with the API token, describing each video', async () => {
    process.env.VIMEO_ACCESS_TOKEN = 'tok'
    const { fn, calls } = fakeFetch({
      'https://api.vimeo.com/users/esdip/videos?page=1': {
        body: {
          data: [
            apiVideo('3000001'),
            apiVideo('3000002', { privacy: { embed: 'private', view: 'anybody' } }),
          ],
          paging: { next: '/users/esdip/videos?page=2' },
        },
      },
      'https://api.vimeo.com/users/esdip/videos?page=2': {
        body: { data: [apiVideo('3000003', { language: 'en' })], paging: { next: null } },
      },
      'https://api.vimeo.com/videos/3000003/texttracks': {
        body: { data: [{ language: 'es', active: true }] },
      },
    })
    const { req, creates, ledger } = fakeRequest()
    const summary = await scanChannel(req, vimeo, fn, 0)

    expect(summary).toMatchObject({
      found: 3,
      added: 2,
      skipped: { 'not-embeddable': 1 },
      complete: true,
    })
    // No oEmbed: the API already described the videos.
    expect(calls.some((call) => call.includes('oembed'))).toBe(false)
    expect(shortsOf(creates)[0]?.data).toMatchObject({
      title: 'Corto 3000001',
      durationSeconds: 480,
      originalLanguage: 'es',
      languageSource: 'provider',
    })
    // The English video came in because it has Spanish subtitles.
    expect(shortsOf(creates)[1]?.data).toMatchObject({ originalLanguage: 'en' })
    expect(sourceData(creates)).toMatchObject({ providerDescription: 'Una descripción' })
    expect(ledger.find((row) => row.externalId === '3000003')).toMatchObject({
      outcome: 'added',
      spokenLanguages: ['en'],
      subtitles: ['es'],
    })
  })

  it('sends the token as a bearer and reads the page', async () => {
    let auth: string | null = null
    const fn = (async (_url: string | URL | Request, init?: RequestInit) => {
      auth = new Headers(init?.headers).get('authorization')
      return new Response(JSON.stringify({ data: [apiVideo('4000001')], paging: { next: null } }))
    }) as typeof fetch
    const page = await fetchVimeoApiPage('esdip', 1, 'tok', fn)
    expect(auth).toBe('bearer tok')
    expect(page.next).toBeNull()
    expect(page.videos[0]).toMatchObject({
      id: '4000001',
      details: {
        durationSeconds: 480,
        embeddable: true,
        language: 'es',
        thumbnailUrl: 'https://i.vimeocdn.com/video/4000001_960',
      },
    })
  })
})
