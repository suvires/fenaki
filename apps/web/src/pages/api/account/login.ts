import { loginOutcome } from '../../../lib/account/outcomes.ts'
import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { checkEmail } from '../../../lib/account/rules.ts'
import { setSession } from '../../../lib/account/session.ts'

interface LoginResponse {
  token?: string
  exp?: number
}

export const POST = accountRoute({ limit: 'login' }, async ({ body, context }) => {
  const email = checkEmail(body.email)
  if (!email.ok || typeof body.password !== 'string' || body.password === '')
    return fail('invalid', 401)
  const login = await cms<LoginResponse>('members/login', {
    method: 'POST',
    body: { email: email.email, password: body.password },
  })
  const outcome = loginOutcome(login.status)
  if (outcome === 'invalid') return fail('invalid', 401)
  if (outcome === 'unverified') return fail('unverified', 403)
  if (outcome === 'server' || !login.data?.token || !login.data.exp) return fail('server', 503)
  setSession(context.cookies, login.data.token, login.data.exp)
  return json({ ok: true })
})
