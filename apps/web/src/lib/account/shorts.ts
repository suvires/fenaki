/** Short ids by slug, for the routes that write rows about a short. Published shorts only. */
import type { Locale } from '@fenaki/i18n'
import { cms, type Page } from './payload.ts'

const TTL_MS = 60 * 1000
const known = new Map<string, { id: number; until: number }>()

/** The id of the published short with this slug, or undefined: unknown, draft or withdrawn. */
export async function publishedShortId(locale: Locale, slug: string): Promise<number | undefined> {
  const key = `${locale}:${slug}`
  const hit = known.get(key)
  if (hit && hit.until > Date.now()) return hit.id
  const result = await cms<Page<{ id: number }>>('shorts', {
    query: {
      locale,
      depth: 0,
      limit: 1,
      'where[slug][equals]': slug,
      'where[status][equals]': 'published',
      'select[slug]': true,
    },
  })
  const id = result.data?.docs?.[0]?.id
  if (id === undefined) return undefined
  if (known.size > 2000) known.clear()
  known.set(key, { id, until: Date.now() + TTL_MS })
  return id
}
