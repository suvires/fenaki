import { looksLikeToken, tokenOutcome } from '../../../lib/account/outcomes.ts'
import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'

/** Consumes the token of the verification email. A POST from the page, never a GET, so that mail scanners following the link do not use it up. */
export const POST = accountRoute({ limit: 'verify' }, async ({ body }) => {
  if (!looksLikeToken(body.token)) return fail('invalid_token', 400)
  const result = await cms(`members/verify/${encodeURIComponent(body.token)}`, { method: 'POST' })
  const outcome = tokenOutcome(result.status)
  if (outcome === 'invalid_token') return fail('invalid_token', 400)
  if (outcome === 'server') return fail('server', 503)
  return json({ ok: true })
})
