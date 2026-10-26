/** Rules for viewer accounts that do not depend on Astro, so tests can use them. */
import { checkEmail } from '@fenaki/waitlist'

/** Shortest password a viewer can choose. The CMS enforces the same number. */
export const MIN_PASSWORD_LENGTH = 10
/** Longest accepted, so a request cannot make the hashing work on megabytes. */
export const MAX_PASSWORD_LENGTH = 200

export type PasswordProblem = 'empty' | 'short' | 'long'

export function checkPassword(
  value: unknown,
): { ok: true; password: string } | { ok: false; error: PasswordProblem } {
  if (typeof value !== 'string' || value === '') return { ok: false, error: 'empty' }
  if (value.length < MIN_PASSWORD_LENGTH) return { ok: false, error: 'short' }
  if (value.length > MAX_PASSWORD_LENGTH) return { ok: false, error: 'long' }
  return { ok: true, password: value }
}

export { checkEmail }

/** The name a viewer gave, trimmed and cut to what the CMS stores; empty is no name. */
export function cleanName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const name = value.replace(/\s+/g, ' ').trim().slice(0, 80)
  return name === '' ? undefined : name
}

/**
 * Where to go after signing in: a path of this site, never another origin. Anything that is not a
 * plain absolute path (`//host`, `/\host`, `https://…`, `javascript:`), or that leads to the API,
 * is refused.
 */
export function safeNext(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 500) return undefined
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return undefined
  // Control characters and encoded slashes/backslashes at the start are how open redirects hide.
  // eslint-disable-next-line no-control-regex -- exactly what is being refused
  if (/[\u0000-\u001f\u007f]/.test(value)) return undefined
  let url: URL
  try {
    url = new URL(value, 'https://site.invalid')
  } catch {
    return undefined
  }
  if (url.origin !== 'https://site.invalid') return undefined
  if (url.pathname.startsWith('/api/')) return undefined
  return `${url.pathname}${url.search}${url.hash}`
}

/** The sign-in page, remembering where the visitor was going. */
export function signInUrl(signInPath: string, next: string | undefined): string {
  const safe = safeNext(next)
  return safe ? `${signInPath}?next=${encodeURIComponent(safe)}` : signInPath
}

/** A short's slug as the catalog writes it: lowercase letters, digits and hyphens. */
export function checkSlug(value: unknown): string | undefined {
  return typeof value === 'string' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    value.length <= 200
    ? value
    : undefined
}

export const RATINGS = ['dislike', 'like', 'love'] as const
export type RatingValue = (typeof RATINGS)[number]

export function checkRating(value: unknown): RatingValue | undefined {
  return RATINGS.find((rating) => rating === value)
}

const MAX_SECONDS = 12 * 60 * 60

/** Where a viewer is in a short: finite, within a sane running time, the position within the duration. */
export function checkProgress(
  position: unknown,
  duration: unknown,
): { position: number; duration: number } | undefined {
  if (typeof position !== 'number' || typeof duration !== 'number') return undefined
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return undefined
  if (duration < 1 || duration > MAX_SECONDS || position < 0) return undefined
  return { position: Math.min(position, duration), duration }
}
