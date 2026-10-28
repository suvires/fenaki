/**
 * What every state-changing account route does first, without Astro, so tests can use it: refuse
 * requests that did not come from this site (CSRF), tell clients apart by address, rate-limit,
 * and read a small JSON body.
 */
import { createRateLimit } from '../rate-limit.ts'

/**
 * A request is from this site when its `Origin` is this site: the configured public address, or
 * the host the request was sent to (which a page on another site cannot forge). Without `Origin`,
 * browsers that send `Sec-Fetch-Site: same-origin` are accepted; anything else is refused.
 */
export function isSameOrigin(headers: Headers, siteUrl: string): boolean {
  const origin = headers.get('origin')
  if (origin) {
    let host: string
    try {
      host = new URL(origin).host
    } catch {
      return false
    }
    const requested = headers.get('x-forwarded-host') ?? headers.get('host')
    return host === new URL(siteUrl).host || host === requested
  }
  return headers.get('sec-fetch-site') === 'same-origin'
}

/**
 * The visitor's address. Behind Cloudflare (the production setup: the only way in is the tunnel)
 * it is the `CF-Connecting-IP` header; otherwise the socket's address.
 */
export function clientIp(headers: Headers, socketAddress: string | undefined): string {
  return headers.get('cf-connecting-ip')?.trim() || socketAddress || 'unknown'
}

const MINUTE = 60 * 1000

/** Requests allowed per address in a window, by kind of action. */
export const LIMITS = {
  signup: [5, 60 * MINUTE],
  login: [10, 10 * MINUTE],
  forgot: [5, 10 * MINUTE],
  reset: [10, 10 * MINUTE],
  verify: [20, 10 * MINUTE],
  password: [10, 10 * MINUTE],
  delete: [5, 10 * MINUTE],
  merge: [20, 10 * MINUTE],
  export: [10, 10 * MINUTE],
  // «Sube tu corto»: each submission or check asks YouTube or Vimeo.
  submit: [20, 10 * MINUTE],
  session: [120, MINUTE],
  write: [240, MINUTE],
  progress: [240, MINUTE],
} as const

export type LimitKind = keyof typeof LIMITS

export type Limiter = (kind: LimitKind, ip: string, now?: number) => boolean

export function createLimiter(): Limiter {
  const limits = new Map<LimitKind, ReturnType<typeof createRateLimit>>()
  return (kind, ip, now) => {
    let allow = limits.get(kind)
    if (!allow) {
      allow = createRateLimit(LIMITS[kind][0], LIMITS[kind][1])
      limits.set(kind, allow)
    }
    return allow(ip, now)
  }
}

export const MAX_BODY_BYTES = 64 * 1024

/** A JSON object from the body (also what `sendBeacon` sends), or undefined if it is not one. */
export async function readJson(request: Request): Promise<Record<string, unknown> | undefined> {
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) return undefined
  const text = await request.text().catch(() => '')
  if (text.length === 0 || text.length > MAX_BODY_BYTES) return undefined
  try {
    const value: unknown = JSON.parse(text)
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}
