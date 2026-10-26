/**
 * The shell of every `/api/account/*` route: same-origin check for anything that changes state,
 * a per-address rate limit, a signed-in member when the route needs one, a small JSON body, and
 * errors that never leak what the CMS said.
 */
import type { APIContext, APIRoute } from 'astro'
import { reportError } from '../sentry.ts'
import { siteUrl } from '../services.ts'
import { clientIp, createLimiter, isSameOrigin, readJson, type LimitKind } from './guards.ts'
import type { SessionMember } from './session.ts'

const limiter = createLimiter()

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

export const fail = (error: string, status: number) => json({ error }, status)

interface RouteOptions {
  /** Which rate limit applies. */
  limit: LimitKind
  /** The route needs a signed-in member. */
  member?: boolean
  /** The route reads no body (sign-out, export). */
  noBody?: boolean
}

export interface Call<M extends boolean = false> {
  body: Record<string, unknown>
  member: M extends true ? SessionMember : SessionMember | undefined
  context: APIContext
}

export function accountRoute<M extends boolean = false>(
  options: RouteOptions & { member?: M },
  handler: (call: Call<M>) => Promise<Response>,
): APIRoute {
  return async (context) => {
    const { request } = context
    const reads = request.method === 'GET' || request.method === 'HEAD'
    if (!reads && !isSameOrigin(request.headers, siteUrl)) return fail('origin', 403)
    const ip = clientIp(request.headers, context.clientAddress)
    if (!limiter(options.limit, ip))
      return json({ error: 'rate_limited' }, 429, { 'Retry-After': '60' })
    const member = context.locals.member
    if (options.member && !member) return fail('signed_out', 401)
    let body: Record<string, unknown> = {}
    if (!reads && !options.noBody) {
      const parsed = await readJson(request)
      if (!parsed) return fail('invalid', 400)
      body = parsed
    }
    try {
      return await handler({ body, member, context } as Call<M>)
    } catch (error) {
      console.error('account: request failed', request.method, context.url.pathname, error)
      reportError(error, context.url.pathname)
      return fail('server', 503)
    }
  }
}
