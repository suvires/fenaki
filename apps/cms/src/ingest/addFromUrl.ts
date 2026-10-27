import type { Endpoint, PayloadRequest } from 'payload'
import { isAdminUser } from '../access.ts'
import { inLanguage, label, type AdminLabel } from '../labels.ts'
import { queueShortReview } from '../jobs/queue.ts'
import { unplayableReason } from './check.ts'
import { createShortWithSource } from './createShort.ts'
import { fetchVideoMetadata, ingestKeys } from './metadata.ts'
import type { Fetch } from './oembed.ts'
import { parseVideoUrl } from './url.ts'

export const addFromUrlErrors = {
  unauthorized: label('Sign in to add shorts.', 'Inicia sesión para añadir cortos.'),
  invalidUrl: label(
    'Paste the URL of a YouTube or Vimeo video.',
    'Pega la URL de un vídeo de YouTube o Vimeo.',
  ),
  duplicate: label('This video is already in the catalog.', 'Este vídeo ya está en el catálogo.'),
  unreachable: label(
    'The provider did not answer. Try again in a few minutes.',
    'El proveedor no ha respondido. Prueba de nuevo en unos minutos.',
  ),
  broken: label('This video does not exist.', 'Este vídeo no existe.'),
  private: label('This video is private.', 'Este vídeo es privado.'),
  'not-embeddable': label(
    'The owner has disabled embedding: it cannot enter the catalog as an embed.',
    'Su titular ha desactivado la inserción: no puede entrar en el catálogo como embed.',
  ),
  'age-restricted': label(
    'This video is age restricted and does not play embedded.',
    'Este vídeo tiene restricción de edad y no se reproduce incrustado.',
  ),
} satisfies Record<string, AdminLabel>

export type AddResult =
  | { ok: true; shortId: number; title: string }
  | { ok: false; status: number; error: keyof typeof addFromUrlErrors; shortId?: number }

/**
 * Creates a short and its source from a video URL, filled with what the providers say, waiting
 * for review. Nothing is published: an editor checks the channel is official and completes it.
 */
export async function addShortFromUrl(
  req: PayloadRequest,
  input: string,
  fetchFn: Fetch = fetch,
): Promise<AddResult> {
  const video = parseVideoUrl(input)
  if (!video) return { ok: false, status: 400, error: 'invalidUrl' }

  const existing = await req.payload.find({
    collection: 'sources',
    where: { provider: { equals: video.provider }, externalId: { equals: video.externalId } },
    limit: 1,
    depth: 0,
    req,
  })
  if (existing.docs[0]) {
    const short = existing.docs[0].short
    return {
      ok: false,
      status: 409,
      error: 'duplicate',
      shortId: typeof short === 'object' ? short.id : short,
    }
  }

  const metadata = await fetchVideoMetadata(video, ingestKeys(), fetchFn)
  if (!metadata.assessment.conclusive) return { ok: false, status: 502, error: 'unreachable' }
  const reason = unplayableReason(metadata.assessment)
  if (reason) return { ok: false, status: 422, error: reason }

  const created = await createShortWithSource(req, metadata, { origin: 'Added from a URL' })
  // The editor is about to open it: the proposal is requested now, not with the nightly batch.
  await queueShortReview(req, created.shortId).catch(() => undefined)
  return { ok: true, ...created }
}

/** POST /api/shorts/from-url with `{ "url": "…" }`, for the «Add from a URL» box in the admin panel. */
export const addFromUrlEndpoint: Endpoint = {
  path: '/from-url',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!isAdminUser(req.user))
      return Response.json(
        { error: inLanguage(addFromUrlErrors.unauthorized, language) },
        { status: 401 },
      )
    const body = (await req.json?.().catch(() => ({}))) as { url?: unknown } | undefined
    const result = await addShortFromUrl(req, typeof body?.url === 'string' ? body.url : '')
    if (result.ok)
      return Response.json({ id: result.shortId, title: result.title }, { status: 201 })
    return Response.json(
      { error: inLanguage(addFromUrlErrors[result.error], language), id: result.shortId },
      { status: result.status },
    )
  },
}
