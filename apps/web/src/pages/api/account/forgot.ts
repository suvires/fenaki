import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { checkEmail } from '../../../lib/account/rules.ts'

/** Sends a reset link when there is an account. The answer is the same either way. */
export const POST = accountRoute({ limit: 'forgot' }, async ({ body }) => {
  const email = checkEmail(body.email)
  if (!email.ok) return fail(`email_${email.error}`, 400)
  const result = await cms('members/forgot-password', {
    method: 'POST',
    body: { email: email.email },
  })
  if (result.status >= 500) return fail('server', 503)
  return json({ status: 'sent' })
})
