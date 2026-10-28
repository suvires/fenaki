/**
 * Removing a short from the signed-in viewer's history, from wherever it shows (the history page,
 * «Seguir viendo»): one call to the account, then an event so every place that lists it drops it.
 */
import { api } from './accountClient.ts'

export const REMOVED_EVENT = 'fenaki:history-removed'

/** Removes the short from the history; resolves to whether the account did. */
export async function removeFromHistory(slug: string, locale: string): Promise<boolean> {
  const result = await api('viewings', 'DELETE', { slug, locale })
  if (result.ok) window.dispatchEvent(new CustomEvent(REMOVED_EVENT, { detail: { slug } }))
  return result.ok
}

/** Calls back with the slug of each short removed from the history. Returns the unsubscribe. */
export function onRemovedFromHistory(callback: (slug: string) => void): () => void {
  const listener = (event: Event) => {
    const slug = (event as CustomEvent<{ slug?: unknown }>).detail?.slug
    if (typeof slug === 'string') callback(slug)
  }
  window.addEventListener(REMOVED_EVENT, listener)
  return () => window.removeEventListener(REMOVED_EVENT, listener)
}
