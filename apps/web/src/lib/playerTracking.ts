/**
 * Follows the player frame of a short in the browser and saves the signed-in viewer's progress to
 * their account: every ~15 seconds while watching and when the page is left. It only listens to
 * messages from the provider's own window; nothing else is loaded.
 */
import { api } from './accountClient.ts'
import {
  createProgressTracker,
  handshake,
  parsePlayerMessage,
  type Progress,
} from './playerProgress.ts'

export interface TrackOptions {
  frame: HTMLIFrameElement
  provider: string
  slug: string
  locale: string
}

const ENDPOINT = '/api/account/viewings'

/** Sends the last progress as the page is going away: `sendBeacon` survives it, `fetch` may not. */
function beacon(body: Record<string, unknown>): void {
  const data = JSON.stringify(body)
  try {
    // text/plain keeps it a simple same-origin request; the route reads the body whatever the type.
    if (navigator.sendBeacon(ENDPOINT, new Blob([data], { type: 'text/plain' }))) return
  } catch {
    // Fall through to fetch.
  }
  void fetch(ENDPOINT, { method: 'POST', body: data, keepalive: true }).catch(() => undefined)
}

/** Starts following the frame. Returns the function that stops it. */
export function trackPlayer({ frame, provider, slug, locale }: TrackOptions): () => void {
  const talk = handshake(provider)
  if (!talk) return () => undefined

  const body = (progress: Progress) => ({
    slug,
    locale,
    position: progress.position,
    duration: progress.duration,
  })
  const tracker = createProgressTracker({
    send: (progress, { final }) => {
      if (final) beacon(body(progress))
      else void api('viewings', 'POST', body(progress), { keepalive: true })
    },
  })

  let listening = false
  const onMessage = (event: MessageEvent) => {
    // Only the player's own window, from the provider's own origin.
    if (event.source !== frame.contentWindow || event.origin !== talk.origin) return
    const update = parsePlayerMessage(event.origin, event.data)
    if (!update) {
      // A Vimeo `ready` or a YouTube reply to `listening` without progress: the player is there.
      listening = true
      return
    }
    listening = true
    tracker.update(update)
  }
  const ask = () => {
    for (const message of talk.message) frame.contentWindow?.postMessage(message, talk.origin)
  }
  // The frame may load before or after this runs; ask on load and keep asking until it answers.
  frame.addEventListener('load', ask)
  let tries = 0
  const retry = window.setInterval(() => {
    if (listening || ++tries > 40) return window.clearInterval(retry)
    ask()
  }, 500)

  const leave = () => tracker.flush()
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') leave()
  }
  window.addEventListener('message', onMessage)
  window.addEventListener('pagehide', leave)
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    leave()
    window.clearInterval(retry)
    frame.removeEventListener('load', ask)
    window.removeEventListener('message', onMessage)
    window.removeEventListener('pagehide', leave)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
