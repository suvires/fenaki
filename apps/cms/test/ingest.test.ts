import { describe, expect, it } from 'vitest'
import { assess, unplayableReason } from '../src/ingest/check.ts'
import { cleanTitle, fetchVideoMetadata } from '../src/ingest/metadata.ts'
import { classifyStatus, fetchOEmbed, type Fetch } from '../src/ingest/oembed.ts'
import { bestMatch } from '../src/ingest/tmdb.ts'
import { parseVideoUrl } from '../src/ingest/url.ts'
import { parseIsoDuration, toYouTubeVideo, type YouTubeVideo } from '../src/ingest/youtube.ts'

const YOUTU = 'https://www.youtube.com/watch?v=4INwx_tmTKw'

/** A fetch that answers from a table of URL prefixes, and records what was asked. */
function fakeFetch(routes: Record<string, { status?: number; body?: unknown }>) {
  const calls: string[] = []
  const fn = (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input)
    calls.push(url)
    const match = Object.keys(routes).find((prefix) => url.startsWith(prefix))
    if (!match) throw new Error(`unexpected request ${url}`)
    const { status = 200, body = {} } = routes[match] ?? {}
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
  }) as Fetch
  return { fn, calls }
}

describe('parseVideoUrl', () => {
  it.each([
    'https://www.youtube.com/watch?v=4INwx_tmTKw',
    'https://youtube.com/watch?v=4INwx_tmTKw&t=10s',
    'https://m.youtube.com/watch?v=4INwx_tmTKw',
    'https://youtu.be/4INwx_tmTKw?si=abc',
    'https://www.youtube.com/embed/4INwx_tmTKw',
    'https://www.youtube-nocookie.com/embed/4INwx_tmTKw?autoplay=1',
    'https://www.youtube.com/shorts/4INwx_tmTKw',
    '  https://www.youtube.com/live/4INwx_tmTKw  ',
  ])('reads the YouTube id from %s', (url) => {
    expect(parseVideoUrl(url)).toEqual({
      provider: 'youtube',
      externalId: '4INwx_tmTKw',
      url: 'https://www.youtube.com/watch?v=4INwx_tmTKw',
    })
  })

  it('reads Vimeo ids, keeping the hash of unlisted videos', () => {
    expect(parseVideoUrl('https://vimeo.com/22439234')).toMatchObject({
      provider: 'vimeo',
      externalId: '22439234',
    })
    expect(parseVideoUrl('https://vimeo.com/channels/staffpicks/22439234')?.externalId).toBe(
      '22439234',
    )
    expect(parseVideoUrl('https://player.vimeo.com/video/22439234?h=ab12cd34ef')).toEqual({
      provider: 'vimeo',
      externalId: '22439234/ab12cd34ef',
      url: 'https://vimeo.com/22439234/ab12cd34ef',
    })
    expect(parseVideoUrl('https://vimeo.com/22439234/ab12cd34ef')?.externalId).toBe(
      '22439234/ab12cd34ef',
    )
  })

  it.each([
    'not a url',
    'ftp://youtube.com/watch?v=4INwx_tmTKw',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/@Cuerdas',
    'https://vimeo.com/terjes',
    'https://example.com/watch?v=4INwx_tmTKw',
  ])('rejects %s', (url) => {
    expect(parseVideoUrl(url)).toBeUndefined()
  })
})

describe('oEmbed', () => {
  it('maps HTTP statuses to what they mean for each provider', () => {
    expect(classifyStatus('youtube', 401)).toBe('not-embeddable')
    expect(classifyStatus('youtube', 403)).toBe('private')
    expect(classifyStatus('youtube', 404)).toBe('missing')
    expect(classifyStatus('vimeo', 403)).toBe('not-embeddable')
    expect(classifyStatus('vimeo', 404)).toBe('missing')
    expect(classifyStatus('youtube', 429)).toBe('error')
    expect(classifyStatus('vimeo', 500)).toBe('error')
  })

  it('reads the title, channel, thumbnail and, on Vimeo, the duration', async () => {
    const { fn, calls } = fakeFetch({
      'https://vimeo.com/api/oembed.json': {
        body: {
          title: 'The Mountain',
          author_name: 'TSO Photography',
          author_url: 'https://vimeo.com/terjes',
          thumbnail_url: 'https://i.vimeocdn.com/video/1.jpg',
          duration: 185,
          upload_date: '2011-04-12 07:31:32',
        },
      },
    })
    const result = await fetchOEmbed({ provider: 'vimeo', url: 'https://vimeo.com/22439234' }, fn)
    expect(result).toMatchObject({
      kind: 'ok',
      title: 'The Mountain',
      authorName: 'TSO Photography',
      durationSeconds: 185,
    })
    expect(calls[0]).toContain('url=https%3A%2F%2Fvimeo.com%2F22439234')
  })

  it('treats network failures as inconclusive', async () => {
    const fn = (async () => {
      throw new Error('ECONNRESET')
    }) as Fetch
    const result = await fetchOEmbed({ provider: 'youtube', url: 'https://youtu.be/x' }, fn)
    expect(result).toEqual({ kind: 'error', message: 'oEmbed request failed: ECONNRESET' })
  })
})

describe('YouTube Data API', () => {
  it('parses ISO 8601 durations', () => {
    expect(parseIsoDuration('PT10M52S')).toBe(652)
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723)
    expect(parseIsoDuration('PT45S')).toBe(45)
    expect(parseIsoDuration('P0D')).toBeNull()
    expect(parseIsoDuration('nonsense')).toBeNull()
  })

  it('reads embeddability, privacy and age restriction', () => {
    const video = toYouTubeVideo({
      id: 'abc',
      snippet: {
        title: 'T',
        channelId: 'UC1',
        channelTitle: 'Canal',
        defaultAudioLanguage: 'es-419',
      },
      contentDetails: { duration: 'PT5M', contentRating: { ytRating: 'ytAgeRestricted' } },
      status: { embeddable: false, privacyStatus: 'public' },
    })
    expect(video).toMatchObject({
      durationSeconds: 300,
      embeddable: false,
      ageRestricted: true,
      channelId: 'UC1',
      audioLanguage: 'es-419',
    })
  })
})

const apiVideo = (overrides: Partial<YouTubeVideo> = {}): YouTubeVideo => ({
  id: 'abc',
  title: 'T',
  channelId: 'UC1',
  channelTitle: 'Canal',
  durationSeconds: 300,
  embeddable: true,
  privacyStatus: 'public',
  ageRestricted: false,
  publishedAt: null,
  audioLanguage: null,
  thumbnailUrl: null,
  ...overrides,
})

describe('assess', () => {
  const ok = {
    kind: 'ok' as const,
    title: 'T',
    authorName: null,
    authorUrl: null,
    thumbnailUrl: null,
    durationSeconds: null,
    uploadedAt: null,
  }

  it('finds the reason a source cannot play from oEmbed alone', () => {
    expect(unplayableReason(assess(ok))).toBeUndefined()
    expect(unplayableReason(assess({ kind: 'missing', httpStatus: 404 }))).toBe('broken')
    expect(unplayableReason(assess({ kind: 'private', httpStatus: 403 }))).toBe('private')
    expect(unplayableReason(assess({ kind: 'not-embeddable', httpStatus: 401 }))).toBe(
      'not-embeddable',
    )
  })

  it('never hides anything on an inconclusive answer', () => {
    const assessment = assess({ kind: 'error', message: 'HTTP 503' })
    expect(assessment.conclusive).toBe(false)
    expect(unplayableReason(assessment)).toBeUndefined()
  })

  it('trusts the YouTube Data API when there is a key', () => {
    expect(unplayableReason(assess(ok, apiVideo({ ageRestricted: true })))).toBe('age-restricted')
    expect(unplayableReason(assess(ok, apiVideo({ embeddable: false })))).toBe('not-embeddable')
    expect(unplayableReason(assess(ok, apiVideo({ privacyStatus: 'private' })))).toBe('private')
    expect(unplayableReason(assess({ kind: 'missing', httpStatus: 404 }, null))).toBe('broken')
    expect(unplayableReason(assess(ok, apiVideo()))).toBeUndefined()
  })
})

describe('cleanTitle', () => {
  it.each([
    ['"Cuerdas", Cortometraje completo', 'Cuerdas'],
    ['La espera | Cortometraje', 'La espera'],
    ['Cortometraje - La espera', 'La espera'],
    ['Hola, adiós', 'Hola, adiós'],
    ['Corto', 'Corto'],
  ])('%s → %s', (raw, clean) => {
    expect(cleanTitle(raw)).toBe(clean)
  })
})

describe('bestMatch', () => {
  const results = [
    { id: 1, title: 'Cuerdas', release_date: '1998-01-01' },
    { id: 2, title: 'Cuerdas', original_title: 'Cuerdas', release_date: '2014-02-01' },
  ]
  it('needs the same title, and a year within one when both are known', () => {
    expect(bestMatch(results, 'cuerdas', 2013)?.id).toBe(2)
    expect(bestMatch(results, 'Cuerdas', null)?.id).toBe(1)
    expect(bestMatch(results, 'Cuerdas rotas', 2013)).toBeUndefined()
  })
})

describe('fetchVideoMetadata', () => {
  it('works with the public oEmbed endpoint only, without keys', async () => {
    const { fn, calls } = fakeFetch({
      'https://www.youtube.com/oembed': {
        body: {
          title: '"Cuerdas", Cortometraje completo',
          author_name: 'Cuerdas Cortometraje Oficial',
          author_url: 'https://www.youtube.com/@Cuerdas',
          thumbnail_url: 'https://i.ytimg.com/vi/4INwx_tmTKw/hqdefault.jpg',
        },
      },
    })
    const video = { provider: 'youtube', externalId: '4INwx_tmTKw', url: YOUTU } as const
    const metadata = await fetchVideoMetadata(video, {}, fn)
    expect(metadata).toMatchObject({
      title: 'Cuerdas',
      channel: { name: 'Cuerdas Cortometraje Oficial', url: 'https://www.youtube.com/@Cuerdas' },
      durationSeconds: null,
      tmdb: undefined,
    })
    expect(calls).toHaveLength(1)
  })

  it('adds the YouTube Data API and TMDB when their keys are set', async () => {
    const { fn, calls } = fakeFetch({
      'https://www.youtube.com/oembed': { body: { title: 'Cuerdas' } },
      'https://www.googleapis.com/youtube/v3/videos': {
        body: {
          items: [
            {
              id: '4INwx_tmTKw',
              snippet: { title: 'Cuerdas', channelId: 'UC9', channelTitle: 'Cuerdas Oficial' },
              contentDetails: { duration: 'PT10M52S' },
              status: { embeddable: true, privacyStatus: 'public' },
            },
          ],
        },
      },
      'https://api.themoviedb.org/3/search/movie': {
        body: { results: [{ id: 254470, title: 'Cuerdas', release_date: '2014-01-01' }] },
      },
      'https://api.themoviedb.org/3/movie/254470': {
        body: {
          id: 254470,
          title: 'Cuerdas',
          release_date: '2014-01-01',
          runtime: 11,
          original_language: 'es',
          production_countries: [{ iso_3166_1: 'ES' }],
        },
      },
    })
    const video = { provider: 'youtube', externalId: '4INwx_tmTKw', url: YOUTU } as const
    const metadata = await fetchVideoMetadata(video, { youtube: 'yt-key', tmdb: 'tmdb-key' }, fn)
    expect(metadata).toMatchObject({
      durationSeconds: 652,
      channel: { name: 'Cuerdas Oficial', externalId: 'UC9' },
      originalLanguage: 'es',
      tmdb: { id: 254470, year: 2014, country: 'ES' },
    })
    expect(calls.find((url) => url.includes('googleapis'))).toContain('key=yt-key')
    expect(calls.find((url) => url.includes('themoviedb'))).toContain('api_key=tmdb-key')
  })
})
