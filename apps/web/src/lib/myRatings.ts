/**
 * Ratings: how a viewer rated each short. Two backends behind one interface: signed out, this
 * browser's localStorage; signed in, the account, through the site's API (changes show at once, are
 * sent in order, and one that fails is undone). Everything goes through this module.
 */

import type { Rating } from '@fenaki/ui'
import { api, createQueue, isSignedIn, pageState } from './accountClient.ts'

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

/** The account's ratings, once the page has said there is an account. */
let accountRatings: Ratings | undefined
const enqueue = createQueue()

function accountMap(): Ratings | undefined {
  if (!isSignedIn()) return undefined
  accountRatings ??= { ...pageState().ratings }
  return accountRatings
}

const language = () =>
  typeof document === 'undefined' ? undefined : document.documentElement.lang || undefined

function emit(): void {
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  } catch {
    // Not in a browser.
  }
}

/** Every rating given, by slug. Never throws: corrupt or unreadable storage is no ratings. */
export function readRatings(): Ratings {
  return accountMap() ?? readLocal()
}

/** What this browser kept while nobody was signed in (to merge into an account). */
export function readLocal(): Ratings {
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
  emit()
}

/** Forgets what this browser kept, once it has been merged into an account. */
export function clearLocal(): void {
  memory = {}
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    // Blocked: nothing to forget.
  }
}

export function getRating(slug: string): Rating | undefined {
  return readRatings()[slug]
}

/** Rates a short, or clears its rating with `undefined`. Past the cap, the oldest rating goes. */
export function setRating(slug: string, rating: Rating | undefined): void {
  const mine = accountMap()
  const { [slug]: previous, ...rest } = mine ?? readLocal()
  if (rating === undefined && previous === undefined) return
  // Object keys keep insertion order: re-rating moves the short to the end, the newest.
  const next =
    rating === undefined
      ? rest
      : Object.fromEntries(Object.entries({ ...rest, [slug]: rating }).slice(-MAX_ITEMS))
  if (!mine) return write(next)

  accountRatings = next
  emit()
  void enqueue(() =>
    rating === undefined
      ? api('ratings', 'DELETE', { slug, locale: language() })
      : api('ratings', 'PUT', { slug, value: rating, locale: language() }),
  ).then((result) => {
    if (result.ok) return
    const others = Object.fromEntries(
      Object.entries(accountRatings ?? {}).filter(([key]) => key !== slug),
    )
    accountRatings = previous === undefined ? others : { ...others, [slug]: previous }
    emit()
  })
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

/** Test helper: forgets the in-memory fallback and the account's copy. */
export function resetMemory(): void {
  memory = {}
  accountRatings = undefined
}
