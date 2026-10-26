/**
 * Server-to-server calls to Payload's REST API on behalf of a viewer. The browser never talks to
 * the CMS for accounts: it talks to this site's `/api/account/*` routes, which call this. The
 * viewer's token goes in the `Authorization` header and never reaches the page.
 */
import { CMS_URL } from 'astro:env/server'

export interface CmsResult<T = unknown> {
  status: number
  data: T | undefined
}

interface CmsRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  token?: string
  body?: unknown
  query?: Record<string, string | number | boolean>
}

/**
 * Calls the CMS and returns its status and JSON, whatever the status: callers map errors to the
 * site's own codes. Network failures throw, and the route answers 503.
 */
export async function cms<T = unknown>(
  path: string,
  request: CmsRequest = {},
): Promise<CmsResult<T>> {
  const url = new URL(`/api/${path}`, CMS_URL)
  for (const [key, value] of Object.entries(request.query ?? {}))
    url.searchParams.set(key, String(value))
  const response = await fetch(url, {
    method: request.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'es',
      ...(request.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(request.token ? { Authorization: `JWT ${request.token}` } : {}),
    },
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    signal: AbortSignal.timeout(10_000),
  })
  const data = (await response.json().catch(() => undefined)) as T | undefined
  return { status: response.status, data }
}

export interface Page<T> {
  docs: T[]
  totalDocs: number
}
