import { randomBytes } from 'node:crypto'
import type { Endpoint, Payload } from 'payload'
import { accountEmailHtml, accountEmailSubject, accountLink } from './emails.ts'

/** The same account is not mailed again within this time. */
export const RESEND_INTERVAL_MS = 60 * 1000

/**
 * Sends a new verification link to an account that never verified its email, e.g. a viewer who
 * signed up again because the first email got lost. Does nothing for unknown or verified
 * addresses, and for an account mailed less than a minute ago; the caller answers the same either
 * way, so the address cannot be probed.
 */
export async function resendVerification(
  payload: Payload,
  email: string,
  now = Date.now(),
): Promise<boolean> {
  const found = await payload.find({
    collection: 'members',
    where: { email: { equals: email.trim().toLowerCase() }, _verified: { not_equals: true } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const member = found.docs[0]
  if (!member) return false
  if (now - Date.parse(member.updatedAt) < RESEND_INTERVAL_MS) return false

  const token = randomBytes(20).toString('hex')
  await payload.update({
    collection: 'members',
    id: member.id,
    data: { _verificationToken: token } as never,
    overrideAccess: true,
  })
  await payload.sendEmail({
    to: member.email,
    subject: accountEmailSubject('verify'),
    html: accountEmailHtml('verify', accountLink('verify', token)),
  })
  return true
}

/** POST /api/members/resend-verification { email }: always answers 200. */
export const resendVerificationEndpoint: Endpoint = {
  path: '/resend-verification',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.().catch(() => undefined)) as { email?: unknown } | undefined
    if (typeof body?.email === 'string' && body.email.length <= 254)
      await resendVerification(req.payload, body.email).catch((error: unknown) =>
        req.payload.logger.error({ err: error }, 'resend verification failed'),
      )
    return Response.json({ message: 'ok' })
  },
}
