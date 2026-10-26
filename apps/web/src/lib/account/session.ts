/**
 * The viewer's session on this site. Payload's JWT lives in a cookie of this site, `httpOnly`,
 * `SameSite=Lax`, for the whole site (`Path=/`) and `Secure` (as a `__Host-` cookie) when the site
 * is served over HTTPS. The middleware resolves it once per request into `locals.member` and
 * refreshes the token before it runs out.
 */
import type { AstroCookies } from 'astro'
import { siteUrl } from '../services.ts'
import { cms } from './payload.ts'

/** A signed-in viewer, as pages and routes see them. The token never goes to the browser's scripts. */
export interface SessionMember {
  id: number
  email: string
  name?: string
  token: string
}

const secure = siteUrl.startsWith('https:')
export const SESSION_COOKIE = secure ? '__Host-fenaki-session' : 'fenaki-session'

/** The token is refreshed when it has less than this left (of 30 days). */
const REFRESH_WITHIN_SECONDS = 14 * 24 * 60 * 60

export function setSession(cookies: AstroCookies, token: string, exp: number): void {
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(0, exp - Math.floor(Date.now() / 1000)),
  })
}

export function clearSession(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/', secure, httpOnly: true, sameSite: 'lax' })
}

interface MeResponse {
  user: { id: number; email: string; name?: string | null; collection?: string } | null
  exp?: number
}

/** Asks the CMS who the token belongs to; refreshes it when it is close to expiring. */
export async function resolveSession(
  token: string,
): Promise<{ member: SessionMember; refreshed?: { token: string; exp: number } } | undefined> {
  let me
  try {
    me = await cms<MeResponse>('members/me', { token })
  } catch {
    // The CMS is unreachable: not a reason to sign anyone out. Treat the request as signed out.
    return undefined
  }
  const user = me.data?.user
  if (me.status !== 200 || !user || user.collection !== 'members') return undefined
  let member: SessionMember = {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    token,
  }

  const exp = me.data?.exp ?? 0
  if (exp - Date.now() / 1000 > REFRESH_WITHIN_SECONDS) return { member }
  const refresh = await cms<{ refreshedToken?: string; exp?: number }>('members/refresh-token', {
    method: 'POST',
    token,
  }).catch(() => undefined)
  const refreshedToken = refresh?.data?.refreshedToken
  if (refresh?.status !== 200 || !refreshedToken || !refresh.data?.exp) return { member }
  member = { ...member, token: refreshedToken }
  return { member, refreshed: { token: refreshedToken, exp: refresh.data.exp } }
}
