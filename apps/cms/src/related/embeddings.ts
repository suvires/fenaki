import { createHash } from 'node:crypto'
import { createTranslator } from '@fenaki/i18n'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { PayloadRequest, TaskConfig } from 'payload'
import { LONG_QUEUE } from '../jobs/queue.ts'

/**
 * Every published short has an embedding (Voyage AI) of what it is about: title, kind of film,
 * genres, themes and synopsis. «Si te ha gustado» looks for the nearest ones (pgvector, table
 * `short_embeddings`) besides the shared traits in related.ts. A no-op without VOYAGE_API_KEY.
 */
export const EMBEDDING_MODEL = 'voyage-4'
export const EMBEDDING_DIMENSIONS = 1024
/** Texts per request to Voyage, well under its limits. */
const BATCH = 64
const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings'

export const embeddingsEnabled = () => Boolean(process.env.VOYAGE_API_KEY)

export interface EmbeddableShort {
  id: number
  title?: string | null
  originalTitle?: string | null
  synopsis?: string | null
  type?: string | null
  genres?: string[] | null
  themes?: string[] | null
}

const t = createTranslator('es')

/** What the embedding is made from, in Spanish: the catalog's main locale. */
export function embeddingText(short: EmbeddableShort) {
  const lines = [short.title?.trim() ?? '']
  const original = short.originalTitle?.trim()
  if (original && original !== lines[0]) lines.push(original)
  const kinds = [
    ...(short.type ? [t(`short.types.${short.type}` as 'short.types.fiction')] : []),
    ...(short.genres ?? []).map((genre) => t(`short.genres.${genre}` as 'short.genres.drama')),
    ...(short.themes ?? []).map((theme) => t(`short.themes.${theme}` as 'short.themes.family')),
  ]
  if (kinds.length > 0) lines.push(kinds.join(', '))
  const synopsis = short.synopsis?.trim()
  if (synopsis) lines.push(synopsis)
  return lines.filter(Boolean).join('\n')
}

/** Changes when the text or the model does: only those shorts are embedded again. */
export const contentHash = (text: string) =>
  createHash('sha256').update(`${EMBEDDING_MODEL}:${EMBEDDING_DIMENSIONS}\n${text}`).digest('hex')

type Fetch = typeof fetch

/** One embedding per text, in order. */
export async function embed(texts: string[], fetchFn: Fetch = fetch): Promise<number[][]> {
  const response = await fetchFn(VOYAGE_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.VOYAGE_API_KEY ?? ''}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
      input_type: 'document',
      output_dimension: EMBEDDING_DIMENSIONS,
    }),
  })
  if (!response.ok) throw new Error(`Voyage AI: ${response.status} ${await response.text()}`)
  const body = (await response.json()) as { data: { index: number; embedding: number[] }[] }
  return body.data.sort((a, b) => a.index - b.index).map((item) => item.embedding)
}

const drizzle = (req: PayloadRequest) => (req.payload.db as unknown as PostgresAdapter).drizzle
const vectorLiteral = (values: number[]) => `[${values.join(',')}]`

const SELECT = {
  title: true,
  originalTitle: true,
  synopsis: true,
  type: true,
  genres: true,
  themes: true,
} as const

/**
 * Embeds the published shorts whose text changed since their last embedding (or that have none):
 * one short, or the whole catalog. Running it again does nothing.
 */
export async function embedShorts(
  req: PayloadRequest,
  shortId?: number,
  fetchFn: Fetch = fetch,
): Promise<{ embedded: number }> {
  if (!embeddingsEnabled()) return { embedded: 0 }
  const shorts = await req.payload.find({
    collection: 'shorts',
    locale: 'es',
    where: {
      status: { equals: 'published' },
      ...(shortId === undefined ? {} : { id: { equals: shortId } }),
    },
    select: SELECT,
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const stored = await drizzle(req).execute<{ short_id: number; content_hash: string }>(
    sql`SELECT short_id, content_hash FROM short_embeddings`,
  )
  const hashes = new Map(stored.rows.map((row) => [row.short_id, row.content_hash]))
  const stale = shorts.docs
    .map((short) => {
      const text = embeddingText(short as EmbeddableShort)
      return { id: short.id, text, hash: contentHash(text) }
    })
    .filter((short) => short.text && hashes.get(short.id) !== short.hash)

  for (let start = 0; start < stale.length; start += BATCH) {
    const batch = stale.slice(start, start + BATCH)
    const vectors = await embed(
      batch.map((short) => short.text),
      fetchFn,
    )
    for (const [i, short] of batch.entries()) {
      const vector = vectors[i]
      if (!vector) throw new Error(`Voyage AI: no embedding for short ${short.id}`)
      await drizzle(req).execute(sql`
        INSERT INTO short_embeddings (short_id, model, content_hash, embedding, updated_at)
        VALUES (${short.id}, ${EMBEDDING_MODEL}, ${short.hash}, ${vectorLiteral(vector)}::vector, now())
        ON CONFLICT (short_id) DO UPDATE SET model = excluded.model,
          content_hash = excluded.content_hash, embedding = excluded.embedding, updated_at = now()`)
    }
  }
  return { embedded: stale.length }
}

/**
 * The published shorts nearest to this one by meaning, with their cosine similarity (1 is the
 * same text), best first. Empty when it has no embedding yet.
 */
export async function nearestShorts(req: PayloadRequest, id: number, limit: number) {
  if (!embeddingsEnabled()) return []
  return drizzle(req).transaction(async (tx) => {
    // The HNSW index returns at most ef_search rows; enough for the pool, and the published
    // filter keeps scanning instead of returning fewer (pgvector's iterative scans).
    await tx.execute(sql.raw(`SET LOCAL hnsw.ef_search = ${Math.max(limit, 40)}`))
    await tx.execute(sql`SET LOCAL hnsw.iterative_scan = relaxed_order`)
    const found = await tx.execute<{ id: number; similarity: number }>(sql`
      SELECT e.short_id AS id, 1 - (e.embedding <=> base.embedding) AS similarity
      FROM short_embeddings base, short_embeddings e
      JOIN shorts s ON s.id = e.short_id
      WHERE base.short_id = ${id} AND e.short_id <> ${id} AND s.status = 'published'
      ORDER BY e.embedding <=> base.embedding
      LIMIT ${limit}`)
    return found.rows.map((row) => ({ id: Number(row.id), similarity: Number(row.similarity) }))
  })
}

/** The cosine similarity of this short's embedding to each of the others that have one. */
export async function similarities(req: PayloadRequest, id: number, others: number[]) {
  if (!embeddingsEnabled() || others.length === 0) return new Map<number, number>()
  const found = await drizzle(req).execute<{ id: number; similarity: number }>(sql`
    SELECT e.short_id AS id, 1 - (e.embedding <=> base.embedding) AS similarity
    FROM short_embeddings base, short_embeddings e
    WHERE base.short_id = ${id} AND e.short_id IN ${sql.raw(`(${others.map(Number).join(',')})`)}`)
  return new Map(found.rows.map((row) => [Number(row.id), Number(row.similarity)]))
}

/**
 * Queues the embedding of one short, unless one is already waiting (it reads the short when it
 * runs). A no-op without VOYAGE_API_KEY.
 */
export async function queueEmbedShort(req: PayloadRequest, shortId: number): Promise<void> {
  if (!embeddingsEnabled()) return
  const waiting = await req.payload.count({
    collection: 'payload-jobs',
    where: {
      taskSlug: { equals: 'embedShorts' },
      'input.shortId': { equals: shortId },
      completedAt: { exists: false },
      processing: { equals: false },
    },
    req,
  })
  if (waiting.totalDocs > 0) return
  await req.payload.jobs.queue({ task: 'embedShorts', input: { shortId }, req })
}

/**
 * One short (queued when it is published or its text changes), or the whole catalog: every
 * night as a safety net, which only embeds what changed.
 */
export const embedShortsTask: TaskConfig<{
  input: { shortId?: number }
  output: { embedded: number }
}> = {
  slug: 'embedShorts',
  label: 'Embed shorts for «Si te ha gustado»',
  retries: 3,
  inputSchema: [{ name: 'shortId', type: 'number' }],
  outputSchema: [{ name: 'embedded', type: 'number', required: true }],
  schedule: [{ cron: '0 30 4 * * *', queue: LONG_QUEUE }],
  handler: async ({ input, req }) => {
    const output = await embedShorts(req, input?.shortId ?? undefined)
    if (input?.shortId === undefined)
      req.payload.logger.info(`embedShorts: ${output.embedded} shorts embedded`)
    return { output }
  },
}
