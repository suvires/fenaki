import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { signupOutcome } from '../../../lib/account/outcomes.ts'
import { cms } from '../../../lib/account/payload.ts'
import { checkEmail, checkPassword, cleanName } from '../../../lib/account/rules.ts'

/**
 * Creates an account; the CMS emails the verification link. A new address and one that already has
 * an account get the same answer, so the form cannot be used to find out who has an account.
 */
export const POST = accountRoute({ limit: 'signup' }, async ({ body }) => {
  // Bots fill in the hidden field: pretend it worked.
  if (typeof body.website === 'string' && body.website !== '') return json({ status: 'sent' })
  const email = checkEmail(body.email)
  if (!email.ok) return fail(`email_${email.error}`, 400)
  const password = checkPassword(body.password)
  if (!password.ok) return fail(`password_${password.error}`, 400)

  const created = await cms('members', {
    method: 'POST',
    body: { email: email.email, password: password.password, name: cleanName(body.name) },
  })
  const outcome = signupOutcome(created.status, created.data)
  if (outcome === 'server') return fail('server', 503)
  // An address that exists but never verified gets a new link, in case the first email got lost.
  if (outcome === 'existing')
    await cms('members/resend-verification', {
      method: 'POST',
      body: { email: email.email },
    }).catch(() => undefined)
  return json({ status: 'sent' })
})
