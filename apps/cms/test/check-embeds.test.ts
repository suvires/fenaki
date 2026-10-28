import type { PayloadRequest } from 'payload'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { hideReason } from '../src/ingest/check.ts'
import type { Fetch } from '../src/ingest/oembed.ts'
import { channelGaps, checkEmbeds } from '../src/jobs/checkEmbeds.ts'

type Doc = Record<string, unknown> & { id: number }

/** Just enough of Payload's local API for the checker: find and update over in-memory docs. */
function fakeRequest(collections: Record<'shorts' | 'sources', Doc[]> & { stills?: Doc[] }) {
  const creates: { collection: string; data: Record<string, unknown>; file?: unknown }[] = []
  const deletes: { collection: string; id: number }[] = []
  const updates: { collection: string; id: number; data: Record<string, unknown> }[] = []
  const payload = {
    logger: { info: () => {}, warn: () => {} },
    find: async ({ collection }: { collection: 'shorts' | 'sources' | 'stills' }) => {
      const docs = (collections[collection] ?? []).filter((doc) =>
        collection === 'shorts' ? doc.status === 'published' || doc.hiddenReason : true,
      )
      return { docs, totalDocs: docs.length }
    },
    update: async (args: { collection: string; id: number; data: Record<string, unknown> }) => {
      updates.push(args)
      return { id: args.id }
    },
    create: async (args: { collection: string; data: Record<string, unknown>; file?: unknown }) => {
      creates.push(args)
      return { id: 900 }
    },
    delete: async (args: { collection: string; id: number }) => {
      deletes.push(args)
      return {}
    },
  }
  return { req: { payload } as unknown as PayloadRequest, updates, creates, deletes }
}

/** oEmbed answers by video id: 200, or the given HTTP status. */
const oembedByVideo =
  (statuses: Record<string, number>): Fetch =>
  async (input) => {
    const url = decodeURIComponent(String(input))
    const id = Object.keys(statuses).find((key) => url.includes(key))
    const status = id ? (statuses[id] ?? 200) : 200
    return new Response(status === 200 ? JSON.stringify({ title: 'T' }) : 'Not Found', { status })
  }

const source = (id: number, short: number, externalId: string): Doc => ({
  id,
  short,
  provider: 'youtube',
  externalId,
  url: `https://www.youtube.com/watch?v=${externalId}`,
  problemSince: null,
})

describe('hideReason', () => {
  const ok = { reason: undefined }
  it('hides only when every source is conclusively unplayable', () => {
    expect(hideReason([{ reason: 'broken' }])).toBe('broken')
    expect(hideReason([{ reason: 'private' }, { reason: 'broken' }])).toBe('private')
    expect(hideReason([{ reason: 'broken' }, ok])).toBeUndefined()
    expect(hideReason([])).toBeUndefined()
  })
})

describe('channelGaps', () => {
  const ok = {
    kind: 'ok',
    title: 'Cuerdas',
    authorName: 'Cuerdas Cortometraje Oficial',
    authorUrl: 'https://www.youtube.com/@cuerdas',
    thumbnailUrl: null,
    durationSeconds: null,
    uploadedAt: null,
  } as const

  it('fills the channel address and name the import left empty', () => {
    expect(channelGaps({ channel: { name: 'Cuerdas', kind: 'producer' } }, ok, undefined)).toEqual({
      channel: { name: 'Cuerdas', kind: 'producer', url: 'https://www.youtube.com/@cuerdas' },
    })
  })

  it('never overwrites what is there, and changes nothing without an answer', () => {
    const full = { channel: { name: 'A', url: 'https://www.youtube.com/@a', externalId: 'UC1' } }
    expect(channelGaps(full, ok, undefined)).toEqual({})
    expect(channelGaps({ channel: {} }, { kind: 'missing', httpStatus: 404 }, undefined)).toEqual(
      {},
    )
  })
})

describe('checkEmbeds', () => {
  it('records each check and hides the shorts that can no longer play', async () => {
    const { req, updates } = fakeRequest({
      shorts: [
        { id: 1, title: 'Plays', status: 'published' },
        { id: 2, title: 'Removed', status: 'published' },
        { id: 3, title: 'One source left', status: 'published' },
      ],
      sources: [
        source(10, 1, 'aaaaaaaaaaa'),
        source(20, 2, 'bbbbbbbbbbb'),
        source(30, 3, 'ccccccccccc'),
        source(31, 3, 'ddddddddddd'),
      ],
    })
    const summary = await checkEmbeds(req, oembedByVideo({ bbbbbbbbbbb: 404, ccccccccccc: 401 }), 0)
    expect(summary).toEqual({
      checked: 4,
      skipped: 0,
      problems: 2,
      inconclusive: 0,
      hidden: 1,
      stills: 0,
    })
    expect(updates.find((u) => u.collection === 'sources' && u.id === 20)?.data).toMatchObject({
      status: 'broken',
      problemSince: expect.any(String),
    })
    expect(updates.find((u) => u.collection === 'sources' && u.id === 30)?.data).toMatchObject({
      embeddable: false,
    })
    const hidden = updates.filter((u) => u.collection === 'shorts')
    expect(hidden).toEqual([
      {
        collection: 'shorts',
        id: 2,
        data: { status: 'withdrawn', hiddenReason: 'broken', hiddenAt: expect.any(String) },
        req,
      },
    ])
  })

  it('resumes a check cut short: sources checked tonight are not asked again, but still count', async () => {
    const tonight = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { req, updates } = fakeRequest({
      shorts: [
        { id: 1, title: 'Checked tonight', status: 'published' },
        { id: 2, title: 'Broken tonight', status: 'published' },
      ],
      sources: [
        { ...source(10, 1, 'aaaaaaaaaaa'), lastCheckedAt: tonight },
        { ...source(20, 2, 'bbbbbbbbbbb'), lastCheckedAt: tonight, status: 'broken' },
      ],
    })
    const asked: string[] = []
    const summary = await checkEmbeds(
      req,
      async (url) => {
        asked.push(String(url))
        return new Response('{}', { status: 200 })
      },
      0,
    )
    // The provider is not asked again (only the missing still is downloaded).
    expect(asked.filter((url) => url.includes('oembed'))).toEqual([])
    expect(summary).toMatchObject({ checked: 0, skipped: 2, hidden: 1 })
    expect(updates.filter((u) => u.collection === 'sources')).toEqual([])
    expect(updates.find((u) => u.collection === 'shorts')?.id).toBe(2)
  })

  it('changes nothing but the note when the provider does not answer', async () => {
    const { req, updates } = fakeRequest({
      shorts: [{ id: 1, title: 'Plays', status: 'published' }],
      sources: [source(10, 1, 'aaaaaaaaaaa')],
    })
    const summary = await checkEmbeds(req, oembedByVideo({ aaaaaaaaaaa: 503 }), 0)
    expect(summary).toMatchObject({ inconclusive: 1, hidden: 0 })
    expect(updates).toEqual([
      {
        collection: 'sources',
        id: 10,
        data: { checkNote: 'Inconclusive: oEmbed answered HTTP 503' },
        req,
      },
    ])
  })
})

describe('checkEmbeds stills', () => {
  /** A 4:3 frame with black bars, as YouTube's sddefault: 640x480 with a 640x360 picture. */
  const letterboxed = async () =>
    sharp({ create: { width: 640, height: 480, channels: 3, background: '#000' } })
      .composite([
        {
          input: await sharp({
            create: { width: 640, height: 360, channels: 3, background: '#a07040' },
          })
            .png()
            .toBuffer(),
          top: 60,
          left: 0,
        },
      ])
      .jpeg()
      .toBuffer()

  /** oEmbed answers 200; thumbnails answer by file name, 404 when not listed. */
  const withThumbnails =
    (images: Record<string, Buffer>, requested: string[] = []): Fetch =>
    async (input) => {
      const url = String(input)
      if (!url.includes('i.ytimg.com')) return new Response(JSON.stringify({ title: 'T' }))
      requested.push(url)
      const image = Object.entries(images).find(([key]) => url.endsWith(key))?.[1]
      return image ? new Response(new Uint8Array(image)) : new Response('grey', { status: 404 })
    }

  const published = { id: 1, title: 'Plays', status: 'published' }
  const youtube = { ...source(10, 1, 'aaaaaaaaaaa'), embeddable: true, status: 'ok' }

  it('downloads the provider thumbnail, trims the bars and falls back from a missing maxres', async () => {
    const { req, creates, updates } = fakeRequest({ shorts: [published], sources: [youtube] })
    const requested: string[] = []
    const summary = await checkEmbeds(
      req,
      withThumbnails({ 'sddefault.jpg': await letterboxed() }, requested),
      0,
    )
    expect(summary.stills).toBe(1)
    expect(requested.map((url) => url.split('/').pop())).toEqual([
      'maxresdefault.jpg',
      'sddefault.jpg',
    ])
    expect(creates).toHaveLength(1)
    expect(creates[0]?.data).toMatchObject({ short: 1, origin: 'provider', source: 10 })
    const stored = (creates[0]?.file as { data: Buffer }).data
    const meta = await sharp(stored).metadata()
    expect([meta.width, meta.height]).toEqual([640, 360])
    expect(updates.find((u) => u.collection === 'shorts')?.data).toEqual({ still: 900 })
  })

  it('replaces the provider still in place', async () => {
    const { req, creates, updates } = fakeRequest({
      shorts: [{ ...published, still: 50 }],
      sources: [youtube],
      stills: [{ id: 50, short: 1, origin: 'provider' }],
    })
    await checkEmbeds(req, withThumbnails({ 'maxresdefault.jpg': await letterboxed() }), 0)
    expect(creates).toHaveLength(0)
    expect(updates.find((u) => u.collection === 'stills')?.id).toBe(50)
  })

  it("refreshes a still without sending the text colour: an editor's choice is kept by the collection hook", async () => {
    const { req, updates } = fakeRequest({
      shorts: [{ ...published, still: 50 }],
      sources: [youtube],
      stills: [{ id: 50, short: 1, origin: 'provider', textColor: 'dark', textColorSet: 'manual' }],
    })
    await checkEmbeds(req, withThumbnails({ 'maxresdefault.jpg': await letterboxed() }), 0)
    const data = updates.find((u) => u.collection === 'stills')?.data ?? {}
    expect(data).not.toHaveProperty('textColor')
    expect(data).not.toHaveProperty('textColorSet')
    expect(data).not.toHaveProperty('includesTitle')
  })

  it('never touches a still supplied by the author', async () => {
    const { req, creates, updates, deletes } = fakeRequest({
      shorts: [{ ...published, still: 50 }],
      sources: [youtube],
      stills: [{ id: 50, short: 1, origin: 'author' }],
    })
    const requested: string[] = []
    const summary = await checkEmbeds(req, withThumbnails({}, requested), 0)
    expect(summary.stills).toBe(0)
    expect(requested).toEqual([])
    expect(creates).toEqual([])
    expect(deletes).toEqual([])
    expect(updates.filter((u) => u.collection !== 'sources')).toEqual([])
  })

  it('removes the provider still when the source stops playing', async () => {
    const { req, deletes, updates } = fakeRequest({
      shorts: [{ ...published, still: 50 }],
      sources: [youtube],
      stills: [{ id: 50, short: 1, origin: 'provider' }],
    })
    await checkEmbeds(req, oembedByVideo({ aaaaaaaaaaa: 404 }), 0)
    expect(deletes).toEqual([{ collection: 'stills', id: 50, req }])
    expect(updates.find((u) => 'still' in u.data)?.data).toEqual({
      still: null,
    })
  })
})
