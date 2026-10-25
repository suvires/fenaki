import type { Fetch } from '../ingest/oembed.ts'

/**
 * The custom event the site sends when a viewer starts a short, and the event data key that holds
 * the slug. Keep them in sync with `EVENTS.play` and the `playAttributes` of the short page
 * (apps/web).
 */
export const PLAY_EVENT = 'play'
export const PLAY_PROPERTY = 'short'

export interface UmamiConfig {
  url: string
  websiteId: string
  username: string
  password: string
}

/** The connection to the self-hosted Umami, or undefined when it is not configured. */
export function umamiConfig(
  env: Record<string, string | undefined> = process.env,
): UmamiConfig | undefined {
  if (!env.UMAMI_URL || !env.UMAMI_WEBSITE_ID || !env.UMAMI_PASSWORD) return undefined
  return {
    url: env.UMAMI_URL,
    websiteId: env.UMAMI_WEBSITE_ID,
    username: env.UMAMI_USERNAME || 'admin',
    password: env.UMAMI_PASSWORD,
  }
}

/**
 * Plays per short slug between two instants (milliseconds), from Umami's event data. Throws when
 * Umami cannot be reached or refuses: callers keep what they had.
 */
export async function fetchPlays(
  config: UmamiConfig,
  range: { startAt: number; endAt: number },
  fetchFn: Fetch = fetch,
): Promise<Map<string, number>> {
  const base = config.url.replace(/\/+$/, '')
  const login = await fetchFn(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: config.username, password: config.password }),
  })
  if (!login.ok) throw new Error(`Umami login failed (${login.status})`)
  const { token } = (await login.json()) as { token?: string }
  if (!token) throw new Error('Umami login returned no token')

  const query = new URLSearchParams({
    startAt: String(range.startAt),
    endAt: String(range.endAt),
    event: PLAY_EVENT,
    propertyName: PLAY_PROPERTY,
  })
  const response = await fetchFn(
    `${base}/api/websites/${config.websiteId}/event-data/values?${query}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!response.ok) throw new Error(`Umami event data failed (${response.status})`)
  const rows = (await response.json()) as { value: unknown; total: unknown }[]
  if (!Array.isArray(rows)) throw new Error('Umami event data: unexpected answer')

  const plays = new Map<string, number>()
  for (const { value, total } of rows) {
    if (typeof value === 'string' && typeof total === 'number')
      plays.set(value, (plays.get(value) ?? 0) + total)
  }
  return plays
}
