import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { isPlayerProvider, PLAYER_PROVIDERS } from '../../../lib/playerConsent.ts'

/**
 * The players the member loads without asking, on every device: PUT replaces the whole set (an
 * empty one means «ask me every time»).
 */
export const PUT = accountRoute({ limit: 'write', member: true }, async ({ body, member }) => {
  const { providers } = body
  if (!Array.isArray(providers) || !providers.every(isPlayerProvider)) return fail('invalid', 400)
  const playerConsent = PLAYER_PROVIDERS.filter((p) => providers.includes(p))
  const result = await cms(`members/${member.id}`, {
    method: 'PATCH',
    token: member.token,
    body: { playerConsent },
  })
  if (result.status === 401 || result.status === 403) return fail('signed_out', 401)
  if (result.status !== 200) return fail('server', 503)
  return json({ ok: true, providers: playerConsent })
})
