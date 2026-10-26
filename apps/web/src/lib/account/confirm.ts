import { loginOutcome } from './outcomes.ts'
import { cms } from './payload.ts'
import type { SessionMember } from './session.ts'

/**
 * Checks the member's password again before something they cannot undo or that protects the
 * account (changing the password, deleting it). It signs in once more, which counts as an attempt
 * for the CMS' lockout, and signs that session out right away.
 */
export async function confirmPassword(
  member: SessionMember,
  password: unknown,
): Promise<'ok' | 'wrong' | 'server'> {
  if (typeof password !== 'string' || password === '') return 'wrong'
  const login = await cms<{ token?: string }>('members/login', {
    method: 'POST',
    body: { email: member.email, password },
  })
  const outcome = loginOutcome(login.status)
  if (outcome === 'ok' && login.data?.token) {
    await cms('members/logout', { method: 'POST', token: login.data.token }).catch(() => undefined)
    return 'ok'
  }
  return outcome === 'server' ? 'server' : 'wrong'
}
