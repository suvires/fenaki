/**
 * The viewer's choice about third-party players, per provider: whether the YouTube or Vimeo player
 * may load without asking first. Kept in this browser only (a technical preference of the viewer,
 * never sent to Fenaki) and withdrawn from «Preferencias de reproducción».
 */

export const STORAGE_KEY = 'fenaki:player-consent:v1'
export const CHANGE_EVENT = 'fenaki:player-consent'

/** The providers whose player Fenaki embeds. */
export const PLAYER_PROVIDERS = ['youtube', 'vimeo'] as const
export type PlayerProvider = (typeof PLAYER_PROVIDERS)[number]

export const isPlayerProvider = (value: unknown): value is PlayerProvider =>
  typeof value === 'string' && (PLAYER_PROVIDERS as readonly string[]).includes(value)

type Choices = Partial<Record<PlayerProvider, true>>

/** Used when storage is blocked (private mode): the choice lasts until the page is closed. */
let memory: Choices = {}

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function read(): Choices {
  const store = storage()
  if (!store) return memory
  try {
    const value: unknown = JSON.parse(store.getItem(STORAGE_KEY) ?? '{}')
    if (typeof value !== 'object' || value === null) return {}
    return Object.fromEntries(
      PLAYER_PROVIDERS.filter((p) => (value as Record<string, unknown>)[p] === true).map((p) => [
        p,
        true,
      ]),
    )
  } catch {
    return {}
  }
}

function write(choices: Choices): void {
  memory = choices
  try {
    const store = storage()
    if (Object.keys(choices).length === 0) store?.removeItem(STORAGE_KEY)
    else store?.setItem(STORAGE_KEY, JSON.stringify(choices))
  } catch {
    // Storage full or blocked: the in-memory copy keeps it for this page.
  }
  globalThis.dispatchEvent?.(new Event(CHANGE_EVENT))
}

/** Whether the viewer chose to load this provider's player without being asked. */
export function isRemembered(provider: string): boolean {
  return isPlayerProvider(provider) && read()[provider] === true
}

export function remember(provider: PlayerProvider): void {
  write({ ...read(), [provider]: true })
}

export function forget(provider: PlayerProvider): void {
  const choices = read()
  write(
    Object.fromEntries(
      PLAYER_PROVIDERS.filter((p) => p !== provider && choices[p]).map((p) => [p, true]),
    ),
  )
}

/** Calls `listener` when the choice changes, in this tab or another. Returns the unsubscribe. */
export function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
