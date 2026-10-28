import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'
import { accountEmailHtml, accountEmailSubject, siteOrigin } from '../accounts/emails.ts'

/** The site page where a member sends shorts and follows their submissions. */
export const submitPageUrl = (origin = siteOrigin()) => `${origin}/es/sube-tu-corto`

const idOf = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as { id: number }).id : (value as number)

async function emailMember(
  req: PayloadRequest,
  memberId: number,
  kind: 'submissionApproved' | 'submissionRejected',
  url: string,
  detail?: string,
) {
  const member = await req.payload
    .findByID({ collection: 'members', id: memberId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!member?.email) return false
  await req.payload.sendEmail({
    to: member.email,
    subject: accountEmailSubject(kind),
    html: accountEmailHtml(kind, url, 'es', siteOrigin(), detail),
  })
  return true
}

/** Rejecting a submission emails its sender the reason, once. */
export const notifyRejected: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (doc.status !== 'rejected' || previousDoc?.status === 'rejected') return doc
  try {
    if (await emailMember(req, idOf(doc.member), 'submissionRejected', submitPageUrl(), doc.reason))
      await req.payload.update({
        collection: 'submissions',
        id: doc.id,
        data: { notifiedAt: new Date().toISOString() },
        overrideAccess: true,
        req,
      })
  } catch (error) {
    req.payload.logger.error({ err: error, msg: `submission ${doc.id}: rejection email failed` })
  }
  return doc
}

/**
 * Publishing a submitted short approves its submission and tells the sender, with the link to its
 * page. Called from the shorts' afterChange hook.
 */
export async function approveSubmissionsOf(
  req: PayloadRequest,
  short: { id: number; slug: string },
) {
  const found = await req.payload.find({
    collection: 'submissions',
    where: { short: { equals: short.id }, status: { equals: 'in-review' } },
    depth: 0,
    limit: 10,
    overrideAccess: true,
    req,
  })
  for (const submission of found.docs) {
    const now = new Date().toISOString()
    await req.payload.update({
      collection: 'submissions',
      id: submission.id,
      data: { status: 'approved' },
      overrideAccess: true,
      req,
    })
    try {
      const url = `${siteOrigin()}/es/cortos/${encodeURIComponent(short.slug)}`
      if (await emailMember(req, idOf(submission.member), 'submissionApproved', url))
        await req.payload.update({
          collection: 'submissions',
          id: submission.id,
          data: { notifiedAt: now },
          overrideAccess: true,
          req,
        })
    } catch (error) {
      req.payload.logger.error({
        err: error,
        msg: `submission ${submission.id}: approval email failed`,
      })
    }
  }
}
