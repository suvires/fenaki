import { randomInt } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'
import { isMemberUser } from '../access.ts'
import { CHANNEL_KINDS, type ChannelKind } from '../collections/Sources.ts'
import { queueShortReview } from '../jobs/queue.ts'
import { unplayableReason } from '../ingest/check.ts'
import { createShortWithSource } from '../ingest/createShort.ts'
import { fetchVideoMetadata, ingestKeys } from '../ingest/metadata.ts'
import type { Fetch } from '../ingest/oembed.ts'
import { parseVideoUrl } from '../ingest/url.ts'
import { approveSubmissionsOf } from './notify.ts'
import type { SubmissionStatus } from './Submissions.ts'

/** At most this many submissions waiting (for the code or for review) per member. */
export const MAX_OPEN_SUBMISSIONS = 10
const OPEN: SubmissionStatus[] = ['awaiting-code', 'in-review']
const NOTE_MAX = 1000

/** No 0/O or 1/I: the code is read off a screen and typed into a description. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function verificationCode(random: (max: number) => number = randomInt): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[random(CODE_ALPHABET.length)]
  return `FENAKI-${code}`
}

/** The code anywhere in the description, whatever the case. */
export const descriptionHasCode = (description: string | null, code: string) =>
  Boolean(description?.toUpperCase().includes(code.toUpperCase()))

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
  | 'not_found'
  | 'code_not_found'
  | 'unverifiable'

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
  code: string
  status: SubmissionStatus
  reason: string | null
  createdAt: string
}

const view = (doc: Record<string, unknown>): SubmissionView => ({
  id: doc.id as number,
  videoTitle: (doc.videoTitle as string) ?? '',
  url: doc.url as string,
  code: doc.code as string,
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
 * Starts a submission: the video must be on YouTube or Vimeo, playable embedded and not in the
 * catalog yet. The member gets a code to put in its description.
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
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, NOTE_MAX) : ''

  const sameVideo = {
    provider: { equals: video.provider },
    externalId: { equals: video.externalId },
  }
  const inCatalog = await req.payload.count({ collection: 'sources', where: sameVideo, req })
  if (inCatalog.totalDocs > 0) return failure(409, 'already_in_catalog')
  const open = { status: { in: OPEN } }
  const submitted = await req.payload.count({
    collection: 'submissions',
    where: { and: [sameVideo, open] },
    overrideAccess: true,
    req,
  })
  if (submitted.totalDocs > 0) return failure(409, 'already_submitted')
  const mine = await req.payload.count({
    collection: 'submissions',
    where: { and: [{ member: { equals: memberId } }, open] },
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
      note: note || null,
      code: verificationCode(),
      status: 'awaiting-code',
      acceptedTermsAt: now.toISOString(),
    },
    overrideAccess: true,
    req,
  })
  return { ok: true, value: view(doc as unknown as Record<string, unknown>) }
}

/**
 * Looks for the code in the video's description. Found, the short is created waiting for review,
 * with the code as the evidence that the channel is official, and the team is told.
 */
export async function verifySubmission(
  req: PayloadRequest,
  memberId: number,
  id: unknown,
  fetchFn: Fetch = fetch,
  now = new Date(),
): Promise<Outcome<SubmissionView>> {
  const found =
    typeof id === 'number' && Number.isInteger(id)
      ? await req.payload
          .findByID({ collection: 'submissions', id, depth: 0, overrideAccess: true, req })
          .catch(() => null)
      : null
  const member = found ? (typeof found.member === 'object' ? found.member.id : found.member) : null
  if (!found || member !== memberId) return failure(404, 'not_found')
  if (found.status !== 'awaiting-code')
    return { ok: true, value: view(found as unknown as Record<string, unknown>) }

  const video = parseVideoUrl(found.url)
  if (!video) return failure(400, 'invalid_url')
  const metadata = await fetchVideoMetadata(video, ingestKeys(), fetchFn)
  if (!metadata.assessment.conclusive) return failure(502, 'unreachable')
  const reason = unplayableReason(metadata.assessment)
  if (reason) return failure(422, UNPLAYABLE[reason])
  // Without the YouTube API key there is no description to read.
  if (metadata.description === null) return failure(503, 'unverifiable')
  if (!descriptionHasCode(metadata.description, found.code)) return failure(422, 'code_not_found')

  const evidence = `Verification code ${found.code} found in the video description on ${now.toISOString()} (submission ${found.id} from «Sube tu corto», sent by its ${found.relation}).`
  const existing = await req.payload.find({
    collection: 'sources',
    where: { provider: { equals: video.provider }, externalId: { equals: video.externalId } },
    limit: 1,
    depth: 0,
    req,
  })
  let shortId: number
  if (existing.docs[0]) {
    // Added meanwhile (a channel scan): the submission follows that short.
    const short = existing.docs[0].short
    shortId = typeof short === 'object' ? short.id : short
  } else {
    const created = await createShortWithSource(req, metadata, {
      origin: `Sent from «Sube tu corto» (submission ${found.id})`,
      claimed: { kind: found.relation as ChannelKind, officialEvidence: evidence },
    })
    shortId = created.shortId
    await queueShortReview(req, shortId).catch(() => undefined)
  }
  const updated = await req.payload.update({
    collection: 'submissions',
    id: found.id,
    data: { status: 'in-review', verifiedAt: now.toISOString(), short: shortId },
    overrideAccess: true,
    req,
  })
  const short = await req.payload
    .findByID({ collection: 'shorts', id: shortId, depth: 0, locale: 'es', req })
    .catch(() => null)
  if (short?.status === 'published') await approveSubmissionsOf(req, short)
  await notifyTeam(req, found.id, updated.videoTitle ?? '').catch((error) =>
    req.payload.logger.error({ err: error, msg: `submission ${found.id}: team email failed` }),
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
    text: `Un espectador ha enviado «${title}» desde «Sube tu corto» y ha verificado el canal.\n\nRevísalo: ${admin}`,
  })
}

const memberId = (req: PayloadRequest) =>
  isMemberUser(req.user) && req.user ? (req.user.id as number) : undefined

const reply = <T>(outcome: Outcome<T>, status = 200) =>
  outcome.ok
    ? Response.json(outcome.value, { status })
    : Response.json({ error: outcome.error }, { status: outcome.status })

/** GET /api/submissions/mine, POST /api/submissions/submit and /verify: the signed-in member's. */
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
      return reply(await createSubmission(req, id, body), 201)
    },
  },
  {
    path: '/verify',
    method: 'post',
    handler: async (req) => {
      const id = memberId(req)
      if (!id) return Response.json({ error: 'unauthorized' }, { status: 401 })
      const body = ((await req.json?.().catch(() => ({}))) ?? {}) as Record<string, unknown>
      return reply(await verifySubmission(req, id, body.id))
    },
  },
]
