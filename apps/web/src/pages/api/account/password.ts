import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { checkPassword } from '../../../lib/account/rules.ts'
import { confirmPassword } from '../../../lib/account/confirm.ts'

/** Changes the password; needs the current one. */
export const POST = accountRoute({ limit: 'password', member: true }, async ({ body, member }) => {
  const next = checkPassword(body.next)
  if (!next.ok) return fail(`password_${next.error}`, 400)
  const confirmed = await confirmPassword(member, body.current)
  if (confirmed === 'wrong') return fail('wrong_password', 400)
  if (confirmed === 'server') return fail('server', 503)
  const result = await cms(`members/${member.id}`, {
    method: 'PATCH',
    token: member.token,
    body: { password: next.password },
  })
  if (result.status !== 200) return fail('server', 503)
  return json({ ok: true })
})
