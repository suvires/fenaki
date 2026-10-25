import type { Endpoint, PayloadRequest } from 'payload'
import { slugify } from '../fields/slug.ts'
import { inLanguage, label, type AdminLabel } from '../labels.ts'
import { unplayableReason } from './check.ts'
import { fetchVideoMetadata, ingestKeys, type VideoMetadata } from './metadata.ts'
import type { Fetch } from './oembed.ts'
import { parseVideoUrl } from './url.ts'

const errors = {
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
  | { ok: false; status: number; error: keyof typeof errors; shortId?: number }

/** A slug no other short uses: «cuerdas», then «cuerdas-2». */
async function freeSlug(req: PayloadRequest, title: string): Promise<string> {
  const base = slugify(title) || 'corto'
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    const taken = await req.payload.count({
      collection: 'shorts',
      where: { slug: { equals: slug } },
      locale: 'es',
      req,
    })
    if (taken.totalDocs === 0) return slug
  }
}

/** The shared embed license of a provider («YouTube: …»), created the first time. */
async function embedLicense(req: PayloadRequest, provider: VideoMetadata['video']['provider']) {
  const name = provider === 'youtube' ? 'YouTube' : 'Vimeo'
  const found = await req.payload.find({
    collection: 'licenses',
    where: {
      route: { equals: 'embed' },
      type: { equals: 'platform-terms' },
      name: { like: name },
      and: [{ name: { not_like: '[sample]' } }],
    },
    limit: 1,
    depth: 0,
    req,
  })
  if (found.docs[0]) return found.docs[0].id
  const created = await req.payload.create({
    collection: 'licenses',
    data: {
      name: `${name}: embed desde el canal oficial del titular`,
      route: 'embed',
      type: 'platform-terms',
    },
    req,
  })
  return created.id
}

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

  const now = new Date().toISOString()
  const title = metadata.title || video.externalId
  const short = await req.payload.create({
    collection: 'shorts',
    locale: 'es',
    data: {
      title,
      slug: await freeSlug(req, title),
      durationSeconds: metadata.durationSeconds,
      year: metadata.tmdb?.year ?? null,
      country: metadata.tmdb?.country ?? null,
      originalLanguage: metadata.originalLanguage,
      tmdbId: metadata.tmdb?.id ?? null,
      status: 'review',
    },
    req,
  })
  await req.payload.create({
    collection: 'sources',
    data: {
      short: short.id,
      provider: video.provider,
      externalId: video.externalId,
      url: video.url,
      channel: metadata.channel,
      embeddable: true,
      ageRestricted: false,
      status: 'ok',
      lastCheckedAt: now,
      checkNote: `Added from a URL. Provider title: «${metadata.providerTitle}». ${metadata.assessment.note}`,
      thumbnailUrl: metadata.thumbnailUrl,
      uploadedAt: metadata.uploadedAt,
      license: await embedLicense(req, video.provider),
    },
    req,
  })
  return { ok: true, shortId: short.id, title }
}

/** POST /api/shorts/from-url with `{ "url": "…" }`, for the «Add from a URL» box in the admin panel. */
export const addFromUrlEndpoint: Endpoint = {
  path: '/from-url',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!req.user)
      return Response.json({ error: inLanguage(errors.unauthorized, language) }, { status: 401 })
    const body = (await req.json?.().catch(() => ({}))) as { url?: unknown } | undefined
    const result = await addShortFromUrl(req, typeof body?.url === 'string' ? body.url : '')
    if (result.ok)
      return Response.json({ id: result.shortId, title: result.title }, { status: 201 })
    return Response.json(
      { error: inLanguage(errors[result.error], language), id: result.shortId },
      { status: result.status },
    )
  },
}
