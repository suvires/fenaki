import { randomBytes } from 'node:crypto'
import { checkEmail } from '@fenaki/waitlist'
import type { Endpoint, Payload } from 'payload'
import { isMemberUser } from '../access.ts'
import { accountEmailHtml, accountEmailSubject, accountLink } from './emails.ts'

/** A link to confirm a new email works for this long. */
export const CHANGE_EMAIL_TTL_MS = 24 * 60 * 60 * 1000

const taken = async (payload: Payload, email: string, memberId: number) =>
  (
    await payload.count({
      collection: 'members',
      where: { email: { equals: email }, id: { not_equals: memberId } },
      overrideAccess: true,
    })
  ).totalDocs > 0

/**
 * Starts changing a member's email: the new address is kept aside with a token, and a link to
 * confirm it goes to that address. The email does not change until the link is opened, so a typo
 * never locks anyone out. The site confirms the password before asking.
 */
export async function startEmailChange(
  payload: Payload,
  memberId: number,
  raw: unknown,
  now = Date.now(),
): Promise<'sent' | 'invalid' | 'taken'> {
  const checked = checkEmail(raw)
  if (!checked.ok) return 'invalid'
  const email = checked.email.toLowerCase()
  if (await taken(payload, email, memberId)) return 'taken'
  const token = randomBytes(20).toString('hex')
  await payload.update({
    collection: 'members',
    id: memberId,
    data: {
      pendingEmail: email,
      pendingEmailToken: token,
      pendingEmailExpiresAt: new Date(now + CHANGE_EMAIL_TTL_MS).toISOString(),
    },
    overrideAccess: true,
  })
  await payload.sendEmail({
    to: email,
    subject: accountEmailSubject('email'),
    html: accountEmailHtml('email', accountLink('email', token)),
  })
  return 'sent'
}

/** Consumes the link: the pending address becomes the member's email. */
export async function confirmEmailChange(
  payload: Payload,
  token: unknown,
  now = Date.now(),
): Promise<'changed' | 'invalid' | 'taken'> {
  if (typeof token !== 'string' || !/^[0-9a-f]{40}$/.test(token)) return 'invalid'
  const found = await payload.find({
    collection: 'members',
    where: { pendingEmailToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const member = found.docs[0]
  const expires = member?.pendingEmailExpiresAt ? Date.parse(member.pendingEmailExpiresAt) : 0
  if (!member?.pendingEmail || expires < now) return 'invalid'
  const clear = { pendingEmail: null, pendingEmailToken: null, pendingEmailExpiresAt: null }
  if (await taken(payload, member.pendingEmail, member.id)) {
    await payload.update({
      collection: 'members',
      id: member.id,
      data: clear,
      overrideAccess: true,
    })
    return 'taken'
  }
  await payload.update({
    collection: 'members',
    id: member.id,
    data: { email: member.pendingEmail, ...clear },
    overrideAccess: true,
  })
  return 'changed'
}

/** POST /api/members/change-email { email }: the signed-in member asks to change their email. */
export const changeEmailEndpoint: Endpoint = {
  path: '/change-email',
  method: 'post',
  handler: async (req) => {
    if (!isMemberUser(req.user) || !req.user)
      return Response.json({ error: 'signed_out' }, { status: 401 })
    const body = (await req.json?.().catch(() => undefined)) as { email?: unknown } | undefined
    const outcome = await startEmailChange(req.payload, req.user.id as number, body?.email)
    if (outcome === 'invalid') return Response.json({ error: 'email_invalid' }, { status: 400 })
    if (outcome === 'taken') return Response.json({ error: 'email_taken' }, { status: 409 })
    return Response.json({ message: 'sent' })
  },
}

/** POST /api/members/confirm-email { token }: the link of the email, opened. */
export const confirmEmailEndpoint: Endpoint = {
  path: '/confirm-email',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.().catch(() => undefined)) as { token?: unknown } | undefined
    const outcome = await confirmEmailChange(req.payload, body?.token)
    if (outcome === 'invalid') return Response.json({ error: 'invalid_token' }, { status: 400 })
    if (outcome === 'taken') return Response.json({ error: 'email_taken' }, { status: 409 })
    return Response.json({ message: 'changed' })
  },
}
