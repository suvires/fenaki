/**
 * Following a viewer's progress through the official players' own postMessage protocols, without
 * loading any extra script: YouTube (`enablejsapi=1`: send `listening`, read `infoDelivery`) and
 * Vimeo (`addEventListener` for `timeupdate`). No Astro imports, so tests can use it.
 */
import { VIMEO_ORIGIN, YOUTUBE_ORIGIN } from './csp.ts'

export { VIMEO_ORIGIN, YOUTUBE_ORIGIN }

/** What a player message tells about the viewing. */
export interface PlayerUpdate {
  position?: number
  duration?: number
  ended?: boolean
}

const number = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined

function asObject(data: unknown): Record<string, unknown> | undefined {
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data)
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : undefined
    } catch {
      return undefined
    }
  }
  return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined
}

/**
 * Reads a message from a player window. Only messages from the provider's own origin count;
 * anything else, or anything that carries no progress, is undefined.
 */
export function parsePlayerMessage(origin: string, data: unknown): PlayerUpdate | undefined {
  const message = asObject(data)
  if (!message) return undefined

  if (origin === YOUTUBE_ORIGIN) {
    const info = asObject(message.info)
    if (message.event === 'onStateChange') return message.info === 0 ? { ended: true } : undefined
    if (message.event !== 'infoDelivery' && message.event !== 'initialDelivery') return undefined
    if (!info) return undefined
    const update: PlayerUpdate = {
      position: number(info.currentTime),
      duration: number(info.duration),
    }
    // playerState 0 is «ended».
    if (info.playerState === 0) update.ended = true
    return update.position === undefined && update.duration === undefined && !update.ended
      ? undefined
      : update
  }

  if (origin === VIMEO_ORIGIN) {
    if (message.event === 'ended' || message.event === 'finish') return { ended: true }
    if (message.event !== 'timeupdate' && message.event !== 'playProgress') return undefined
    const info = asObject(message.data)
    if (!info) return undefined
    const position = number(info.seconds)
    const duration = number(info.duration)
    return position === undefined && duration === undefined ? undefined : { position, duration }
  }
  return undefined
}

/** The messages that ask a player to start sending progress, per provider. */
export function handshake(provider: string): { message: unknown[]; origin: string } | undefined {
  if (provider === 'youtube')
    return {
      origin: YOUTUBE_ORIGIN,
      message: [JSON.stringify({ event: 'listening', id: 1, channel: 'widget' })],
    }
  if (provider === 'vimeo')
    return {
      origin: VIMEO_ORIGIN,
      message: ['timeupdate', 'ended'].map((value) => ({ method: 'addEventListener', value })),
    }
  return undefined
}

export interface Progress {
  position: number
  duration: number
}

export interface TrackerOptions {
  /** Called with the progress to save. `final` is the last one before the page goes away. */
  send: (progress: Progress, options: { final: boolean }) => void
  /** Time between saves while watching. */
  intervalMs?: number
  now?: () => number
}

/**
 * Decides when to save: the first progress right away, then at most every ~15 seconds, and
 * whatever is newest when the page is left or the short ends. Never sends the same thing twice.
 */
export function createProgressTracker({
  send,
  intervalMs = 15_000,
  now = Date.now,
}: TrackerOptions) {
  let latest: Progress | undefined
  let lastSentAt = -Infinity
  let lastSent: Progress | undefined
  let duration = 0

  const unchanged = (progress: Progress) =>
    lastSent?.position === progress.position && lastSent.duration === progress.duration

  return {
    /** A message from the player. */
    update(update: PlayerUpdate) {
      if (update.duration !== undefined && update.duration > 0) duration = update.duration
      if (update.ended && duration > 0) latest = { position: duration, duration }
      else if (update.position !== undefined && duration > 0)
        latest = { position: Math.min(update.position, duration), duration }
      else return
      if (update.ended || now() - lastSentAt >= intervalMs) {
        lastSentAt = now()
        if (!unchanged(latest)) {
          lastSent = latest
          send(latest, { final: false })
        }
      }
    },
    /** The page is being left (or hidden): save what is newest. */
    flush() {
      if (!latest || unchanged(latest)) return
      lastSent = latest
      lastSentAt = now()
      send(latest, { final: true })
    },
  }
}

/** A timecode for «Seguir viendo desde 3:24»: minutes and seconds, with hours from one hour. */
export function clock(seconds: number, locale = 'es'): string {
  const whole = Math.max(0, Math.floor(seconds))
  const two = new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false })
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = whole % 60
  return hours > 0
    ? `${hours}:${two.format(minutes)}:${two.format(rest)}`
    : `${minutes}:${two.format(rest)}`
}

/** A viewing worth offering to resume: past the first seconds and not near the end. */
export function resumable(position: number, duration: number): boolean {
  return position >= 5 && duration > 0 && position / duration < 0.9
}
