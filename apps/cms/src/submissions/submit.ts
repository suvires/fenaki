import type { Endpoint, PayloadRequest } from 'payload'
import { isMemberUser } from '../access.ts'
import { CHANNEL_KINDS, type ChannelKind } from '../collections/Sources.ts'
import { queueShortReview } from '../jobs/queue.ts'
import { unplayableReason } from '../ingest/check.ts'
import { createShortWithSource } from '../ingest/createShort.ts'
import { fetchVideoMetadata, ingestKeys } from '../ingest/metadata.ts'
import type { Fetch } from '../ingest/oembed.ts'
import { parseVideoUrl } from '../ingest/url.ts'
import type { SubmissionStatus } from './Submissions.ts'

/** At most this many submissions in review per member. */
export const MAX_OPEN_SUBMISSIONS = 10

export type SubmitError =
  | 'invalid_url'
  | 'invalid_relation'
  | 'terms'
  | 'already_in_catalog'
  | 'already_submitted'
  | 'too_many'
  | 'unreachable'
  | 'broken'
  | 'private'
  | 'not_embeddable'
  | 'age_restricted'

type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: SubmitError }
const failure = (status: number, error: SubmitError) => ({ ok: false as const, status, error })

const UNPLAYABLE = {
  broken: 'broken',
  private: 'private',
  'not-embeddable': 'not_embeddable',
  'age-restricted': 'age_restricted',
} as const

export interface SubmissionView {
  id: number
  videoTitle: string
  url: string
  status: SubmissionStatus
  reason: string | null
  createdAt: string
}

const view = (doc: Record<string, unknown>): SubmissionView => ({
  id: doc.id as number,
  videoTitle: (doc.videoTitle as string) ?? '',
  url: doc.url as string,
  status: doc.status as SubmissionStatus,
  reason: doc.status === 'rejected' ? ((doc.reason as string) ?? null) : null,
  createdAt: doc.createdAt as string,
})

/** A member's submissions, newest first. */
export async function listSubmissions(req: PayloadRequest, memberId: number) {
  const found = await req.payload.find({
    collection: 'submissions',
    where: { member: { equals: memberId } },
    sort: '-createdAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return found.docs.map((doc) => view(doc as unknown as Record<string, unknown>))
}

/**
 * Sends a short: the video must be on YouTube or Vimeo, playable embedded and not in the catalog
 * yet. The short is created waiting for review, with the sender's declaration as the first
 * evidence that the channel is official (the editor checks the channel before publishing), and
 * the team is told.
 */
export async function createSubmission(
  req: PayloadRequest,
  memberId: number,
  body: Record<string, unknown>,
  fetchFn: Fetch = fetch,
  now = new Date(),
): Promise<Outcome<SubmissionView>> {
  const video = parseVideoUrl(typeof body.url === 'string' ? body.url : '')
  if (!video) return failure(400, 'invalid_url')
  const relation = body.relation as ChannelKind
  if (!CHANNEL_KINDS.includes(relation)) return failure(400, 'invalid_relation')
  if (body.acceptTerms !== true) return failure(400, 'terms')

  const sameVideo = {
    provider: { equals: video.provider },
    externalId: { equals: video.externalId },
  }
  const inCatalog = await req.payload.count({ collection: 'sources', where: sameVideo, req })
  if (inCatalog.totalDocs > 0) return failure(409, 'already_in_catalog')
  const inReview = { status: { equals: 'in-review' } }
  const submitted = await req.payload.count({
    collection: 'submissions',
    where: { and: [sameVideo, inReview] },
    overrideAccess: true,
    req,
  })
  if (submitted.totalDocs > 0) return failure(409, 'already_submitted')
  const mine = await req.payload.count({
    collection: 'submissions',
    where: { and: [{ member: { equals: memberId } }, inReview] },
    overrideAccess: true,
    req,
  })
  if (mine.totalDocs >= MAX_OPEN_SUBMISSIONS) return failure(429, 'too_many')

  const metadata = await fetchVideoMetadata(video, ingestKeys(), fetchFn)
  if (!metadata.assessment.conclusive) return failure(502, 'unreachable')
  const reason = unplayableReason(metadata.assessment)
  if (reason) return failure(422, UNPLAYABLE[reason])

  const doc = await req.payload.create({
    collection: 'submissions',
    data: {
      member: memberId,
      videoTitle: metadata.providerTitle || metadata.title || video.externalId,
      url: video.url,
      provider: video.provider,
      externalId: video.externalId,
      relation,
      status: 'in-review',
      acceptedTermsAt: now.toISOString(),
    },
    overrideAccess: true,
    req,
  })
  const evidence = `Declared by the sender on ${now.toISOString()} (submission ${doc.id} from «Sube tu corto», sent as its ${relation}): the channel is theirs or the official one of the rights holder. Check the channel before publishing.`
  const created = await createShortWithSource(req, metadata, {
    origin: `Sent from «Sube tu corto» (submission ${doc.id})`,
    claimed: { kind: relation, officialEvidence: evidence },
  })
  await queueShortReview(req, created.shortId).catch(() => undefined)
  // Their account menu shows «Mis envíos» from now on.
  await req.payload.update({
    collection: 'members',
    id: memberId,
    data: { hasSubmissions: true },
    overrideAccess: true,
    req,
  })
  const updated = await req.payload.update({
    collection: 'submissions',
    id: doc.id,
    data: { short: created.shortId },
    overrideAccess: true,
    req,
  })
  await notifyTeam(req, doc.id, updated.videoTitle ?? '').catch((error) =>
    req.payload.logger.error({ err: error, msg: `submission ${doc.id}: team email failed` }),
  )
  return { ok: true, value: view(updated as unknown as Record<string, unknown>) }
}

/** A plain email to FENAKI's address: a submission is waiting for review. */
async function notifyTeam(req: PayloadRequest, id: number, title: string) {
  const to = process.env.EMAIL_FROM_ADDRESS
  if (!to) return
  const admin = `${(process.env.PAYLOAD_PUBLIC_SERVER_URL ?? '').replace(/\/+$/, '')}/admin/collections/submissions/${id}`
  await req.payload.sendEmail({
    to,
    subject: `Envío en revisión: ${title}`,
    text: `Un espectador ha enviado «${title}» desde «Sube tu corto».\n\nRevísalo, y comprueba que el canal es el oficial: ${admin}`,
  })
}

const memberId = (req: PayloadRequest) =>
  isMemberUser(req.user) && req.user ? (req.user.id as number) : undefined

/** GET /api/submissions/mine and POST /api/submissions/submit: the signed-in member's. */
export const submissionEndpoints: Endpoint[] = [
  {
    path: '/mine',
    method: 'get',
    handler: async (req) => {
      const id = memberId(req)
      if (!id) return Response.json({ error: 'unauthorized' }, { status: 401 })
      return Response.json({ docs: await listSubmissions(req, id) })
    },
  },
  {
    path: '/submit',
    method: 'post',
    handler: async (req) => {
      const id = memberId(req)
      if (!id) return Response.json({ error: 'unauthorized' }, { status: 401 })
      const body = ((await req.json?.().catch(() => ({}))) ?? {}) as Record<string, unknown>
      const outcome = await createSubmission(req, id, body)
      return outcome.ok
        ? Response.json(outcome.value, { status: 201 })
        : Response.json({ error: outcome.error }, { status: outcome.status })
    },
  },
]
