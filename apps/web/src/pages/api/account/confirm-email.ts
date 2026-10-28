import { looksLikeToken } from '../../../lib/account/outcomes.ts'
import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'

/** Consumes the link of the change-email message. A POST from the page, so mail scanners do not use it up. */
export const POST = accountRoute({ limit: 'verify' }, async ({ body }) => {
  if (!looksLikeToken(body.token)) return fail('invalid_token', 400)
  const result = await cms('members/confirm-email', { method: 'POST', body: { token: body.token } })
  if (result.status === 409) return fail('email_taken', 409)
  if (result.status === 400) return fail('invalid_token', 400)
  if (result.status !== 200) return fail('server', 503)
  return json({ ok: true })
})
