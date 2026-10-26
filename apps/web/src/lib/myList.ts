/**
 * «Mi lista»: the shorts a viewer saved. Two backends behind one interface: signed out, this
 * browser's localStorage; signed in, the account, through the site's API. Everything goes through
 * this module, so the islands do not care which one is in use.
 *
 * With an account the list the server rendered into the page is the starting point (see
 * accountClient.ts); changes show at once and are sent in order, and one that fails is undone.
 */

import type { BadgeTone, PosterTone, StillTextColor } from '@fenaki/ui'
import { api, createQueue, isSignedIn, pageState } from './accountClient.ts'

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
  /** Color of the text over the still, and whether the still already carries the title. */
  imageTextColor?: StillTextColor
  imageHasTitle?: boolean
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

/**
 * A short as the catalog shows it now: what is saved, plus what is never stored: the synopsis, the
 * type («Ficción») and the badges, which the floating preview shows.
 */
export type CurrentShort = NewSavedShort & {
  synopsis?: string
  typeLabel?: string
  badges?: { label: string; tone?: BadgeTone }[]
}

/** The catalog's current card data, by slug, as the server renders it for this locale. */
export type CurrentShorts = Record<string, CurrentShort>

/** A saved short with its current catalog data. */
export type ListedShort = SavedShort & Pick<CurrentShort, 'synopsis' | 'typeLabel' | 'badges'>

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

/** The account's list, once the page has said there is an account; undefined when signed out. */
let accountItems: SavedShort[] | undefined
const enqueue = createQueue()

/**
 * What the account keeps of a short is its slug and when it was saved; the rest comes from the
 * catalog (see `withCurrent`), so the other fields are empty until a short is saved on this page.
 */
function accountList(): SavedShort[] | undefined {
  if (!isSignedIn()) return undefined
  accountItems ??= pageState().list.map(stub)
  return accountItems
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

function writeAccount(list: SavedShort[]): void {
  accountItems = list
  emit()
}

/** Sends a change to the account; if it does not go through, puts the short back as it was. */
function sync(method: 'PUT' | 'DELETE', slug: string, previous: SavedShort | undefined): void {
  void enqueue(() => api('list', method, { slug, locale: language() })).then((result) => {
    if (result.ok) return
    const others = (accountItems ?? []).filter((item) => item.slug !== slug)
    writeAccount(previous ? [...others, previous].sort((a, b) => b.savedAt - a.savedAt) : others)
  })
}

/** A saved short with only its slug and date, to be filled in from the catalog (`withCurrent`). */
export function stub(entry: { slug: string; savedAt: number }): SavedShort {
  return { slug: entry.slug, title: '', seconds: 0, tone: 'sala', savedAt: entry.savedAt }
}

/** The saved shorts, newest first. Never throws: corrupt or unreadable storage is an empty list. */
export function readList(): SavedShort[] {
  return accountList() ?? readLocal()
}

/** What this browser kept while nobody was signed in (to merge into an account). */
export function readLocal(): SavedShort[] {
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
  emit()
}

/** Forgets what this browser kept, once it has been merged into an account. */
export function clearLocal(): void {
  memory = []
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    // Blocked: nothing to forget.
  }
}

export function has(slug: string): boolean {
  return readList().some((item) => item.slug === slug)
}

/** Saves a short at the top of the list. Saving it again moves it to the top. */
export function add(item: NewSavedShort): void {
  const mine = accountList()
  const current = mine ?? readLocal()
  const rest = current.filter((saved) => saved.slug !== item.slug)
  const next = [{ ...item, savedAt: Date.now() }, ...rest].slice(0, MAX_ITEMS)
  if (!mine) return write(next)
  const previous = mine.find((saved) => saved.slug === item.slug)
  writeAccount(next)
  sync('PUT', item.slug, previous)
}

export function remove(slug: string): void {
  const mine = accountList()
  const list = mine ?? readLocal()
  const previous = list.find((item) => item.slug === slug)
  if (!previous) return
  const next = list.filter((item) => item.slug !== slug)
  if (!mine) return write(next)
  writeAccount(next)
  sync('DELETE', slug, previous)
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

/** Test helper: forgets the in-memory fallback and the account's copy. */
export function resetMemory(): void {
  memory = []
  accountItems = undefined
}
