import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { cleanName } from '../../../lib/account/rules.ts'

/** Changes the name. The email is not changeable: it would skip the verification. */
export const POST = accountRoute({ limit: 'write', member: true }, async ({ body, member }) => {
  const name = cleanName(body.name)
  const result = await cms(`members/${member.id}`, {
    method: 'PATCH',
    token: member.token,
    // null clears it.
    body: { name: name ?? null },
  })
  if (result.status === 401 || result.status === 403) return fail('signed_out', 401)
  if (result.status !== 200) return fail('server', 503)
  return json({ ok: true, name: name ?? null })
})
