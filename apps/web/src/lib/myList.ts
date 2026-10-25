/**
 * «Mi lista» without accounts: the shorts a viewer saved, kept in this browser's localStorage.
 * Everything goes through this module so that, once accounts exist, the same interface can sync
 * to the account instead.
 */

import type { PosterTone } from '@fenaki/ui'

export const STORAGE_KEY = 'fenaki:my-list:v1'
export const CHANGE_EVENT = 'fenaki:my-list'
export const MAX_ITEMS = 200

/** What a card needs to render without asking the CMS, plus when it was saved. */
export interface SavedShort {
  slug: string
  title: string
  director?: string
  year?: number
  seconds: number
  tone: PosterTone
  /** The card-sized still, when the short had one. */
  image?: string
  /** Epoch milliseconds. */
  savedAt: number
}

export type NewSavedShort = Omit<SavedShort, 'savedAt'>

/** Used when storage is blocked (private mode): the list lives until the page is closed. */
let memory: SavedShort[] = []

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function isSaved(value: unknown): value is SavedShort {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.slug === 'string' &&
    typeof v.title === 'string' &&
    typeof v.seconds === 'number' &&
    typeof v.savedAt === 'number'
  )
}

/** A short as the catalog shows it now: what is saved, plus the synopsis, which is never stored. */
export type CurrentShort = NewSavedShort & { synopsis?: string }

/** The catalog's current card data, by slug, as the server renders it for this locale. */
export type CurrentShorts = Record<string, CurrentShort>

/** A saved short with its current catalog data. */
export type ListedShort = SavedShort & Pick<CurrentShort, 'synopsis'>

/**
 * The saved shorts with the catalog's current data (title, still…) instead of what was stored
 * when they were saved. Shorts no longer published are left out: their pages are gone.
 */
export function withCurrent(items: SavedShort[], current: CurrentShorts): ListedShort[] {
  return items.flatMap((item) => {
    const now = current[item.slug]
    return now ? [{ ...item, ...now, savedAt: item.savedAt }] : []
  })
}

/** The saved shorts, newest first. Never throws: corrupt or unreadable storage is an empty list. */
export function readList(): SavedShort[] {
  try {
    const raw = storage()?.getItem(STORAGE_KEY)
    if (raw === null || raw === undefined) return memory
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isSaved) : []
  } catch {
    return memory
  }
}

function write(list: SavedShort[]): void {
  memory = list
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Blocked or full: the in-memory copy keeps this page working.
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  } catch {
    // Not in a browser.
  }
}

export function has(slug: string): boolean {
  return readList().some((item) => item.slug === slug)
}

/** Saves a short at the top of the list. Saving it again moves it to the top. */
export function add(item: NewSavedShort): void {
  const rest = readList().filter((saved) => saved.slug !== item.slug)
  write([{ ...item, savedAt: Date.now() }, ...rest].slice(0, MAX_ITEMS))
}

export function remove(slug: string): void {
  const list = readList()
  if (list.some((item) => item.slug === slug)) write(list.filter((item) => item.slug !== slug))
}

/** Returns whether the short is saved after the call. */
export function toggle(item: NewSavedShort): boolean {
  if (has(item.slug)) {
    remove(item.slug)
    return false
  }
  add(item)
  return true
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
  memory = []
}
