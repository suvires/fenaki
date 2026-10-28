/**
 * The viewer's choice about third-party players, per provider: whether the YouTube or Vimeo player
 * may load without asking first. Two backends behind one interface: signed out, this browser's
 * localStorage (never sent to FENAKI); signed in, the account, so it holds on every device.
 * Changed at «Preferencias de reproducción».
 *
 * What the browser kept is never merged into an account on sign-in: a choice made for one browser
 * does not silently become a choice for every device.
 */
import { api, createQueue, isSignedIn, pageState } from './accountClient.ts'

export const STORAGE_KEY = 'fenaki:player-consent:v1'
export const CHANGE_EVENT = 'fenaki:player-consent'

/** The providers whose player FENAKI embeds. */
export const PLAYER_PROVIDERS = ['youtube', 'vimeo'] as const
export type PlayerProvider = (typeof PLAYER_PROVIDERS)[number]

export const isPlayerProvider = (value: unknown): value is PlayerProvider =>
  typeof value === 'string' && (PLAYER_PROVIDERS as readonly string[]).includes(value)

type Choices = Partial<Record<PlayerProvider, true>>

const toChoices = (providers: readonly unknown[]): Choices =>
  Object.fromEntries(PLAYER_PROVIDERS.filter((p) => providers.includes(p)).map((p) => [p, true]))

const toProviders = (choices: Choices): PlayerProvider[] =>
  PLAYER_PROVIDERS.filter((p) => choices[p])

/** The same choices with one provider allowed or not. */
const withChoice = (choices: Choices, provider: PlayerProvider, allowed: boolean): Choices =>
  toChoices([...toProviders(choices).filter((p) => p !== provider), ...(allowed ? [provider] : [])])

/** Used when storage is blocked (private mode): the choice lasts until the page is closed. */
let memory: Choices = {}

/** The account's choices, once the page has said there is an account. */
let accountChoices: Choices | undefined
const enqueue = createQueue()

function account(): Choices | undefined {
  if (!isSignedIn()) return undefined
  accountChoices ??= toChoices(pageState().playerConsent ?? [])
  return accountChoices
}

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function readLocal(): Choices {
  const store = storage()
  if (!store) return memory
  try {
    const value: unknown = JSON.parse(store.getItem(STORAGE_KEY) ?? '{}')
    if (typeof value !== 'object' || value === null) return {}
    return toChoices(
      Object.entries(value)
        .filter(([, allowed]) => allowed === true)
        .map(([p]) => p),
    )
  } catch {
    return {}
  }
}

function emit(): void {
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  } catch {
    // Not in a browser.
  }
}

function writeLocal(choices: Choices): void {
  memory = choices
  try {
    const store = storage()
    if (Object.keys(choices).length === 0) store?.removeItem(STORAGE_KEY)
    else store?.setItem(STORAGE_KEY, JSON.stringify(choices))
  } catch {
    // Storage full or blocked: the in-memory copy keeps it for this page.
  }
  emit()
}

/** Where the choice is kept: the account (every device) or this browser. */
export function savedIn(): 'account' | 'browser' {
  return isSignedIn() ? 'account' : 'browser'
}

/** Whether the viewer chose to load this provider's player without being asked. */
export function isRemembered(provider: string): boolean {
  return isPlayerProvider(provider) && (account() ?? readLocal())[provider] === true
}

/**
 * Lets the provider's player load without asking, or asks again from now on. Shows at once; with
 * an account it resolves to whether the account saved it, and a failure is undone.
 */
export function setRemembered(provider: PlayerProvider, allowed: boolean): Promise<boolean> {
  const mine = account()
  const previous = mine ?? readLocal()
  const next = withChoice(previous, provider, allowed)
  if (!mine) {
    writeLocal(next)
    return Promise.resolve(true)
  }

  accountChoices = next
  emit()
  return enqueue(() => api('player-consent', 'PUT', { providers: toProviders(next) })).then(
    (result) => {
      if (result.ok) return true
      // Undo only this provider: a later change to the other one stays.
      accountChoices = withChoice(accountChoices ?? {}, provider, previous[provider] === true)
      emit()
      return false
    },
  )
}

export const remember = (provider: PlayerProvider) => setRemembered(provider, true)
export const forget = (provider: PlayerProvider) => setRemembered(provider, false)

/** Calls `listener` when the choice changes, in this tab or another. Returns the unsubscribe. */
export function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Test helper: forgets the in-memory fallback and the account's copy. */
export function resetMemory(): void {
  memory = {}
  accountChoices = undefined
}
