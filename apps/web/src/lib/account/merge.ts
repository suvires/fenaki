/**
 * Merging what a visitor kept in the browser into the account they just signed in to, without
 * Astro, so tests can use it. The account wins where both have something: a short already in the
 * list keeps its place, a short already rated keeps its rating.
 */
import { checkRating, checkSlug, type RatingValue } from './rules.ts'
import type { AccountState, ListEntry } from './data.ts'

export const MAX_INCOMING = 1000

export interface Incoming {
  list: ListEntry[]
  ratings: Record<string, RatingValue>
}

/** Cleans what the browser sent: valid slugs and ratings only, and no more than it can hold. */
export function parseIncoming(body: Record<string, unknown>, now = Date.now()): Incoming {
  const list: ListEntry[] = []
  if (Array.isArray(body.list))
    for (const entry of body.list.slice(0, MAX_INCOMING)) {
      const slug = checkSlug((entry as { slug?: unknown } | null)?.slug)
      const savedAt = (entry as { savedAt?: unknown } | null)?.savedAt
      if (slug)
        list.push({
          slug,
          savedAt: typeof savedAt === 'number' && savedAt > 0 ? Math.min(savedAt, now) : now,
        })
    }
  const ratings: Record<string, RatingValue> = {}
  if (typeof body.ratings === 'object' && body.ratings !== null && !Array.isArray(body.ratings))
    for (const [slug, value] of Object.entries(body.ratings).slice(0, MAX_INCOMING)) {
      const rating = checkRating(value)
      if (checkSlug(slug) && rating) ratings[slug] = rating
    }
  return { list, ratings }
}

export interface MergePlan {
  list: ListEntry[]
  ratings: [string, RatingValue][]
}

/**
 * What to add to the account. The list is capped: if the browser's shorts do not all fit, the
 * newest ones are kept. Added oldest first, so the account's order matches the browser's.
 */
export function planMerge(
  account: Pick<AccountState, 'list' | 'ratings'>,
  incoming: Incoming,
  caps: { list: number; ratings: number },
): MergePlan {
  const have = new Set(account.list.map((entry) => entry.slug))
  const fresh = incoming.list
    .filter(
      (entry, index, all) =>
        !have.has(entry.slug) && all.findIndex((e) => e.slug === entry.slug) === index,
    )
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, Math.max(0, caps.list - account.list.length))
    .sort((a, b) => a.savedAt - b.savedAt)
  const rated = Object.keys(account.ratings).length
  const ratings = Object.entries(incoming.ratings)
    .filter(([slug]) => account.ratings[slug] === undefined)
    .slice(0, Math.max(0, caps.ratings - rated))
  return { list: fresh, ratings }
}
