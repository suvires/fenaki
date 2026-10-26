/**
 * The logic behind the floating short preview, free of the DOM so it can be tested: where the panel
 * goes, how it grows out of its card, and when it opens and closes.
 */

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** The panel is this much wider than the card it opens over. */
export const WIDTH_RATIO = 1.5
/** The panel's still is 16:9 (ratio-still): its height as a share of its width. */
const STILL_HEIGHT_RATIO = 9 / 16
/** Least gap kept between the panel and the edges of the viewport. */
export const EDGE_GAP = 8

export interface PlaceOptions {
  /** The card's box in viewport coordinates. */
  card: Box
  viewport: { width: number; height: number }
  /** The horizontal span of the page container, in viewport coordinates. */
  bounds: { left: number; right: number }
  /** The panel's height, once it has been measured. Until then only `width` and `left` are exact. */
  panelHeight?: number
}

export interface Placement {
  left: number
  top: number
  width: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max))

/**
 * The panel is centred on its card, 1.5× its width, both ways: the whole panel (still and body)
 * is centred on the card's middle, so it grows evenly over its row. Then it is kept inside the
 * page container and the viewport. Until the panel has been measured, its still stands in for it.
 */
export function placePreview({ card, viewport, bounds, panelHeight }: PlaceOptions): Placement {
  const min = Math.max(bounds.left, EDGE_GAP)
  const max = Math.min(bounds.right, viewport.width - EDGE_GAP)
  const width = Math.min(card.width * WIDTH_RATIO, max - min)
  const left = clamp(card.left + card.width / 2 - width / 2, min, max - width)
  const height = panelHeight ?? width * STILL_HEIGHT_RATIO
  const centred = card.top + card.height / 2 - height / 2
  const top =
    panelHeight === undefined
      ? centred
      : clamp(centred, EDGE_GAP, viewport.height - EDGE_GAP - panelHeight)
  return { left, top, width }
}

/** The transform that makes the panel look like its card: grow from it by animating to none. */
export function growFrom(card: Box, panel: Box): { x: number; y: number; scale: number } {
  return {
    x: card.left + card.width / 2 - (panel.left + panel.width / 2),
    y: card.top + card.height / 2 - (panel.top + panel.height / 2),
    scale: card.width / panel.width,
  }
}

/** Reads a CSS time token such as `450ms` or `0.2s`, in milliseconds. */
export function parseTime(value: string, fallback: number): number {
  const match = /^\s*(-?\d*\.?\d+)(ms|s)\s*$/.exec(value)
  if (!match?.[1]) return fallback
  return match[2] === 's' ? Number(match[1]) * 1000 : Number(match[1])
}

export interface PreviewTimerOptions<T> {
  /** How long the pointer rests on a card before its preview opens. */
  openDelay: number
  /** Grace time before closing once the pointer has left, to cross from the card to the panel. */
  closeDelay: number
  onOpen: (target: T) => void
  onClose: () => void
}

export interface PreviewTimer<T> {
  /** The pointer is over a card. */
  enterCard: (target: T) => void
  /** The pointer left the card (for the panel, or for elsewhere). */
  leaveCard: () => void
  enterPanel: () => void
  leavePanel: () => void
  /** Closes now: scroll, Escape, navigation. Also cancels a preview still waiting to open. */
  close: () => void
}

/**
 * Opens a card's preview after the pointer rests on it, and closes it after the pointer has left
 * both the card and the panel. A card opened while another is open replaces it.
 */
export function createPreviewTimer<T>(options: PreviewTimerOptions<T>): PreviewTimer<T> {
  let current: T | undefined
  let pending: T | undefined
  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined

  const cancelOpen = () => {
    clearTimeout(openTimer)
    openTimer = undefined
    pending = undefined
  }
  const cancelClose = () => {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
  const close = () => {
    cancelOpen()
    cancelClose()
    if (current === undefined) return
    current = undefined
    options.onClose()
  }
  const scheduleClose = () => {
    if (current === undefined) return
    cancelClose()
    closeTimer = setTimeout(close, options.closeDelay)
  }

  return {
    enterCard(target) {
      cancelClose()
      if (target === current) return cancelOpen()
      if (target === pending) return
      cancelOpen()
      pending = target
      openTimer = setTimeout(() => {
        pending = undefined
        openTimer = undefined
        current = target
        options.onOpen(target)
      }, options.openDelay)
    },
    leaveCard() {
      cancelOpen()
      scheduleClose()
    },
    enterPanel: cancelClose,
    leavePanel: scheduleClose,
    close,
  }
}
