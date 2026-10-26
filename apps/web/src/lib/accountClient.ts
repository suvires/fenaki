/**
 * The browser's side of the account: whether someone is signed in, the state the server rendered
 * into the page, and calls to this site's `/api/account/*` routes. Never talks to the CMS, and
 * never sees the session token (it lives in an httpOnly cookie).
 */
import type { Rating } from '@fenaki/ui'

/** What the layout puts in the page for a signed-in viewer (`<script id="fenaki-account">`). */
export interface PageAccountState {
  list: { slug: string; savedAt: number }[]
  ratings: Record<string, Rating>
}

export const STATE_ELEMENT_ID = 'fenaki-account'
export const SIGNED_OUT_EVENT = 'fenaki:signed-out'

/** The layout marks the body when a viewer is signed in. Outside a browser: nobody is. */
export function isSignedIn(): boolean {
  return typeof document !== 'undefined' && document.body?.dataset.signedIn === 'true'
}

let state: PageAccountState | undefined

/** The list and ratings the server rendered into this page, read once. */
export function pageState(): PageAccountState {
  if (state) return state
  state = { list: [], ratings: {} }
  try {
    const raw = document.getElementById(STATE_ELEMENT_ID)?.textContent
    if (raw) state = JSON.parse(raw) as PageAccountState
  } catch {
    // Unreadable: start empty; the server remains the source of truth.
  }
  return state
}

/** Test helper: forgets what was read. */
export function resetPageState(): void {
  state = undefined
}

export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean
  status: number
  /** The route's error code («invalid», «rate_limited», «signed_out»…), when it failed. */
  error?: string
  data?: T
}

/** Calls an account route. Network failures are `{ ok: false, status: 0, error: 'network' }`. */
export async function api<T = Record<string, unknown>>(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: unknown,
  options: { keepalive?: boolean } = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`/api/account/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      credentials: 'same-origin',
      keepalive: options.keepalive,
    })
    const data = (await response.json().catch(() => undefined)) as
      (T & { error?: string }) | undefined
    if (response.status === 401 && data?.error === 'signed_out' && typeof window !== 'undefined')
      window.dispatchEvent(new CustomEvent(SIGNED_OUT_EVENT))
    return {
      ok: response.ok,
      status: response.status,
      error: response.ok ? undefined : (data?.error ?? 'server'),
      data,
    }
  } catch {
    return { ok: false, status: 0, error: 'network' }
  }
}

/**
 * Queues work so a viewer's changes reach the server in the order they were made. A failed step
 * does not stop the ones after it.
 */
export function createQueue() {
  let tail: Promise<unknown> = Promise.resolve()
  return <T>(work: () => Promise<T>): Promise<T> => {
    const run = tail.then(work, work)
    tail = run.catch(() => undefined)
    return run
  }
}
