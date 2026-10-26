import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { confirmPassword } from '../../../lib/account/confirm.ts'
import { clearSession } from '../../../lib/account/session.ts'

/**
 * Deletes the account and everything of it (list, ratings, viewings: the CMS removes them with the
 * member). Needs the password, so a forgotten open session cannot do it.
 */
export const POST = accountRoute(
  { limit: 'delete', member: true },
  async ({ body, member, context }) => {
    const confirmed = await confirmPassword(member, body.password)
    if (confirmed === 'wrong') return fail('wrong_password', 400)
    if (confirmed === 'server') return fail('server', 503)
    const result = await cms(`members/${member.id}`, { method: 'DELETE', token: member.token })
    if (result.status !== 200) return fail('server', 503)
    clearSession(context.cookies)
    return json({ ok: true })
  },
)
