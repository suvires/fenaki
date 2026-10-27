import type { PayloadRequest } from 'payload'
import type { Fetch } from '../../src/ingest/oembed.ts'
import type { Channel } from '../../src/payload-types.ts'

export const UC = 'UC1234567890abcdefghijkl'
export const YT = 'https://www.googleapis.com/youtube/v3'

/** A fetch that answers from a table of URL prefixes, and records what was asked. */
export function fakeFetch(routes: Record<string, { status?: number; body?: unknown }>) {
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

export const ytChannel = (id = UC) => ({
  items: [
    {
      id,
      snippet: { title: 'Cuerdas Films' },
      contentDetails: { relatedPlaylists: { uploads: 'UUuploads' } },
    },
  ],
})

export const ytVideo = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  snippet: { title: `Corto ${id}`, channelId: UC, channelTitle: 'Cuerdas Films' },
  contentDetails: { duration: 'PT10M' },
  status: { embeddable: true, privacyStatus: 'public' },
  ...overrides,
})

export const ytPage = (ids: [string, string][], next?: string) => ({
  nextPageToken: next,
  items: ids.map(([videoId, videoPublishedAt]) => ({
    contentDetails: { videoId, videoPublishedAt },
  })),
})

export const vimeoFeed = (items: { id: string; title: string; date: string }[]) =>
  `<?xml version="1.0"?><rss><channel><title>Terje's Videos</title>${items
    .map(
      (item) =>
        `<item><title><![CDATA[${item.title}]]></title><link>https://vimeo.com/${item.id}</link><pubDate>${item.date}</pubDate></item>`,
    )
    .join('')}</channel></rss>`

/** A public listing page of a Vimeo user: the links to the videos, among other links. */
export const vimeoWebPage = (ids: string[]) =>
  `<html><body><a href="/log_in">Log in</a>${ids
    .map((id) => `<a href="/${id}">video</a><a href="/${id}">again</a>`)
    .join('')}</body></html>`

export type Doc = Record<string, unknown> & { id: number }

export interface FakeOptions {
  /** Videos that are already a source of a short. */
  sources?: { provider: string; externalId: string; short?: number }[]
  channels?: Doc[]
  /** Rows the scanned videos ledger starts with. */
  ledger?: Doc[]
  /** The catalog languages setting; missing means the settings were never saved. */
  catalogLanguages?: string[]
}

/** Just enough of Payload's local API for the scanner: sources, the ledger, creates and updates. */
export function fakeRequest(options: FakeOptions = {}) {
  const creates: { collection: string; data: Record<string, unknown> }[] = []
  const updates: { collection: string; id: number; data: Record<string, unknown> }[] = []
  const warnings: string[] = []
  const queued: { task: string; input: unknown }[] = []
  const ledger: Doc[] = [...(options.ledger ?? [])]
  const sources = options.sources ?? []
  const channels = options.channels ?? []
  let nextId = 100
  const payload = {
    logger: { info: () => {}, warn: (message: string) => warnings.push(message) },
    jobs: {
      queue: async (args: { task: string; input: unknown }) => {
        queued.push({ task: args.task, input: args.input })
      },
    },
    find: async ({
      collection,
      where,
    }: {
      collection: string
      where: Record<string, { in?: string[]; equals?: unknown } | undefined>
    }) => {
      if (collection === 'sources') {
        const ids = where.externalId?.in ?? []
        const docs = sources
          .filter((source) => ids.includes(source.externalId))
          .map((source) => ({ ...source, short: source.short ?? 1 }))
        return { docs, totalDocs: docs.length }
      }
      if (collection === 'scanned-videos') {
        let docs: Doc[]
        const wanted = where.externalId?.in
        if (wanted) {
          docs = ledger.filter(
            (row) =>
              row.provider === where.provider?.equals && wanted.includes(row.externalId as string),
          )
        } else {
          docs = ledger.filter(
            (row) =>
              row.channel === where.channel?.equals &&
              (row.skipReason === 'failed' || row.reevaluate === true),
          )
        }
        return { docs, totalDocs: docs.length }
      }
      if (collection === 'licenses') return { docs: [{ id: 7 }], totalDocs: 1 }
      if (collection === 'channels') return { docs: channels, totalDocs: channels.length }
      return { docs: [], totalDocs: 0 }
    },
    findGlobal: async () => {
      if (!options.catalogLanguages) throw new Error('settings were never saved')
      return { catalogLanguages: options.catalogLanguages }
    },
    count: async () => ({ totalDocs: 0 }),
    create: async (args: { collection: string; data: Record<string, unknown> }) => {
      creates.push(args)
      const doc = { id: nextId++, ...args.data }
      if (args.collection === 'scanned-videos') ledger.push(doc)
      return doc
    },
    update: async (args: {
      collection: string
      id?: number
      where?: { id: { in: number[] } }
      data: Record<string, unknown>
    }) => {
      if (args.collection === 'scanned-videos') {
        for (const row of ledger)
          if (row.id === args.id || args.where?.id.in.includes(row.id))
            Object.assign(row, args.data)
        return { id: args.id, docs: [] }
      }
      updates.push({ ...args, id: args.id as number })
      return { id: args.id }
    },
  }
  return {
    req: { payload } as unknown as PayloadRequest,
    creates,
    updates,
    warnings,
    ledger,
    queued,
  }
}

export const channel = (overrides: Partial<Channel> = {}): Channel => ({
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
  backlogComplete: true,
  rescanAll: false,
  backlogCursor: null,
  lastScannedAt: null,
  lastScanNote: null,
  updatedAt: '',
  createdAt: '',
  ...overrides,
})

export const sourcesOf = (creates: { collection: string; data: Record<string, unknown> }[]) =>
  creates.filter((create) => create.collection === 'sources')
export const shortsOf = (creates: { collection: string; data: Record<string, unknown> }[]) =>
  creates.filter((create) => create.collection === 'shorts')
