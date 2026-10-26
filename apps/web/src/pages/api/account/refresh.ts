import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { clearSession, setSession } from '../../../lib/account/session.ts'

/** Renews the session cookie. The middleware does it by itself near expiry; this is for the page to ask. */
export const POST = accountRoute(
  { limit: 'session', member: true, noBody: true },
  async ({ member, context }) => {
    const result = await cms<{ refreshedToken?: string; exp?: number }>('members/refresh-token', {
      method: 'POST',
      token: member.token,
    })
    if (result.status === 401 || result.status === 403) {
      clearSession(context.cookies)
      return fail('signed_out', 401)
    }
    if (result.status !== 200 || !result.data?.refreshedToken || !result.data.exp)
      return fail('server', 503)
    setSession(context.cookies, result.data.refreshedToken, result.data.exp)
    return json({ ok: true })
  },
)
