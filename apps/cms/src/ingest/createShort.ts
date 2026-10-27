import type { PayloadRequest } from 'payload'
import type { ChannelKind } from '../collections/Sources.ts'
import { slugify } from '../fields/slug.ts'
import type { VideoMetadata } from './metadata.ts'

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

/** A registered channel the short comes from: what its source records as the official channel. */
export interface ChannelOrigin {
  id: number
  name: string | null
  url: string
  externalId: string | null
  kind: ChannelKind
  officialEvidence: string | null
}

export interface CreateShortOptions {
  /** How the short got here, for the source's check note («Added from a URL»). */
  origin: string
  /** Set by the channel scanner: the registered channel is the source's official channel. */
  channel?: ChannelOrigin
  /** Used when the providers do not say what language is spoken. */
  defaultLanguage?: string | null
}

/**
 * Creates a short and its source from video metadata, waiting for review: the single place where
 * a short enters the catalog from a provider. Nothing is published: an editor checks the channel
 * is official and completes the short.
 */
export async function createShortWithSource(
  req: PayloadRequest,
  metadata: VideoMetadata,
  options: CreateShortOptions,
): Promise<{ shortId: number; title: string }> {
  const { video } = metadata
  const { channel } = options
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
      originalLanguage: metadata.originalLanguage ?? options.defaultLanguage ?? null,
      tmdbId: metadata.tmdb?.id ?? null,
      status: 'review',
      ...(channel ? { ingestChannel: channel.id } : {}),
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
      channel: channel
        ? {
            name: channel.name ?? metadata.channel.name,
            kind: channel.kind,
            url: channel.url,
            externalId: channel.externalId ?? metadata.channel.externalId,
          }
        : metadata.channel,
      ...(channel ? { officialEvidence: channel.officialEvidence, ingestChannel: channel.id } : {}),
      embeddable: true,
      ageRestricted: false,
      status: 'ok',
      lastCheckedAt: now,
      checkNote: `${options.origin}. Provider title: «${metadata.providerTitle}». ${metadata.assessment.note}`,
      thumbnailUrl: metadata.thumbnailUrl,
      uploadedAt: metadata.uploadedAt,
      license: await embedLicense(req, video.provider),
    },
    req,
  })
  return { shortId: short.id, title }
}
