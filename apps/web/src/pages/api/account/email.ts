import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { checkEmail } from '../../../lib/account/rules.ts'
import { confirmPassword } from '../../../lib/account/confirm.ts'

/**
 * Asks to change the email; needs the password. The CMS sends a link to the new address, and the
 * email changes only when it is opened (/es/cuenta/confirmar-email).
 */
export const POST = accountRoute({ limit: 'password', member: true }, async ({ body, member }) => {
  const email = checkEmail(body.email)
  if (!email.ok) return fail(`email_${email.error}`, 400)
  if (email.email.toLowerCase() === member.email.toLowerCase()) return fail('email_same', 400)
  const confirmed = await confirmPassword(member, body.password)
  if (confirmed === 'wrong') return fail('wrong_password', 400)
  if (confirmed === 'server') return fail('server', 503)
  const result = await cms<{ error?: string }>('members/change-email', {
    method: 'POST',
    token: member.token,
    body: { email: email.email },
  })
  if (result.status === 409) return fail('email_taken', 409)
  if (result.status === 400) return fail('email_invalid', 400)
  if (result.status === 401 || result.status === 403) return fail('signed_out', 401)
  if (result.status !== 200) return fail('server', 503)
  return json({ ok: true, email: email.email.toLowerCase() })
})
