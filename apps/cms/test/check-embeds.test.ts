import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'
import { hideReason } from '../src/ingest/check.ts'
import type { Fetch } from '../src/ingest/oembed.ts'
import { checkEmbeds } from '../src/jobs/checkEmbeds.ts'

type Doc = Record<string, unknown> & { id: number }

/** Just enough of Payload's local API for the checker: find and update over in-memory docs. */
function fakeRequest(collections: Record<'shorts' | 'sources', Doc[]>) {
  const updates: { collection: string; id: number; data: Record<string, unknown> }[] = []
  const payload = {
    logger: { info: () => {}, warn: () => {} },
    find: async ({ collection }: { collection: 'shorts' | 'sources' }) => {
      const docs = collections[collection].filter((doc) =>
        collection === 'shorts' ? doc.status === 'published' || doc.hiddenReason : true,
      )
      return { docs, totalDocs: docs.length }
    },
    update: async (args: { collection: string; id: number; data: Record<string, unknown> }) => {
      updates.push(args)
      return {}
    },
  }
  return { req: { payload } as unknown as PayloadRequest, updates }
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
    expect(summary).toEqual({ checked: 4, problems: 2, inconclusive: 0, hidden: 1 })
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
