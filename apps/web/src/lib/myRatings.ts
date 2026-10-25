/**
 * Ratings without accounts: how a viewer rated each short, kept in this browser's localStorage.
 * Everything goes through this module so that, once accounts exist, the same interface can sync
 * to the account instead.
 */

import type { Rating } from '@fenaki/ui'

export const STORAGE_KEY = 'fenaki:my-ratings:v1'
export const CHANGE_EVENT = 'fenaki:my-ratings'
export const MAX_ITEMS = 1000

export const RATINGS: readonly Rating[] = ['dislike', 'like', 'love']

/** Slug to rating. */
export type Ratings = Record<string, Rating>

/** Used when storage is blocked (private mode): the ratings live until the page is closed. */
let memory: Ratings = {}

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function isRating(value: unknown): value is Rating {
  return RATINGS.some((rating) => rating === value)
}

/** Every rating given, by slug. Never throws: corrupt or unreadable storage is no ratings. */
export function readRatings(): Ratings {
  try {
    const raw = storage()?.getItem(STORAGE_KEY)
    if (raw === null || raw === undefined) return memory
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isRating(value)))
  } catch {
    return memory
  }
}

function write(ratings: Ratings): void {
  memory = ratings
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(ratings))
  } catch {
    // Blocked or full: the in-memory copy keeps this page working.
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  } catch {
    // Not in a browser.
  }
}

export function getRating(slug: string): Rating | undefined {
  return readRatings()[slug]
}

/** Rates a short, or clears its rating with `undefined`. Past the cap, the oldest rating goes. */
export function setRating(slug: string, rating: Rating | undefined): void {
  const { [slug]: _previous, ...rest } = readRatings()
  if (rating === undefined) {
    if (_previous !== undefined) write(rest)
    return
  }
  // Object keys keep insertion order: re-rating moves the short to the end, the newest.
  const entries = Object.entries({ ...rest, [slug]: rating }).slice(-MAX_ITEMS)
  write(Object.fromEntries(entries))
}

/** Calls back on changes from this page's islands and from other tabs. Returns the unsubscribe. */
export function subscribe(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) callback()
  }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}

/** Test helper: forgets the in-memory fallback. */
export function resetMemory(): void {
  memory = {}
}
