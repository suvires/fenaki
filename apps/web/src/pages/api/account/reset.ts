import { looksLikeToken, tokenOutcome } from '../../../lib/account/outcomes.ts'
import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { checkPassword } from '../../../lib/account/rules.ts'

/** Sets a new password with the token of the reset email. It does not sign in: the viewer does, with the new password. */
export const POST = accountRoute({ limit: 'reset' }, async ({ body }) => {
  if (!looksLikeToken(body.token)) return fail('invalid_token', 400)
  const password = checkPassword(body.password)
  if (!password.ok) return fail(`password_${password.error}`, 400)
  const result = await cms('members/reset-password', {
    method: 'POST',
    body: { token: body.token, password: password.password },
  })
  const outcome = tokenOutcome(result.status)
  if (outcome === 'invalid_token') return fail('invalid_token', 400)
  if (outcome === 'server') return fail('server', 503)
  return json({ ok: true })
})
