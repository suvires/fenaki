import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPreviewTimer,
  growFrom,
  parseTime,
  placePreview,
  WIDTH_RATIO,
  EDGE_GAP,
} from '../src/lib/cardPreview.ts'

const viewport = { width: 1440, height: 900 }
const bounds = { left: 80, right: 1360 }
const card = (left: number, top: number) => ({ left, top, width: 280, height: 157.5 })

describe('placePreview', () => {
  it('centres a panel 1.5 times as wide on the card, its still standing in until measured', () => {
    const place = placePreview({ card: card(600, 300), viewport, bounds })
    expect(place.width).toBe(280 * WIDTH_RATIO)
    expect(place.left).toBe(600 + 140 - 210)
    // The still is 16:9: 420 × 236.25, centred on the card's centre (378.75).
    expect(place.top).toBeCloseTo(378.75 - 236.25 / 2)
  })

  it('once measured, centres the whole panel on the card, so it grows evenly over its row', () => {
    const place = placePreview({ card: card(600, 300), viewport, bounds, panelHeight: 400 })
    // Card centre 378.75: 200 above and 200 below it.
    expect(place.top).toBeCloseTo(378.75 - 200)
  })

  it('stays inside the page container on both sides', () => {
    expect(placePreview({ card: card(80, 300), viewport, bounds }).left).toBe(80)
    const right = placePreview({ card: card(1080, 300), viewport, bounds })
    expect(right.left + right.width).toBe(1360)
  })

  it('stays inside the viewport when the container is wider', () => {
    const wide = { left: -50, right: 2000 }
    expect(placePreview({ card: card(0, 300), viewport, bounds: wide }).left).toBe(EDGE_GAP)
    const right = placePreview({ card: card(1160, 300), viewport, bounds: wide })
    expect(right.left + right.width).toBe(viewport.width - EDGE_GAP)
  })

  it('pulls the whole panel back into the viewport once its height is known', () => {
    const low = placePreview({ card: card(600, 780), viewport, bounds, panelHeight: 400 })
    expect(low.top).toBe(viewport.height - EDGE_GAP - 400)
    const high = placePreview({ card: card(600, -20), viewport, bounds, panelHeight: 400 })
    expect(high.top).toBe(EDGE_GAP)
  })

  it('shrinks to the container when the container is narrower than the panel', () => {
    const narrow = { left: 100, right: 400 }
    const place = placePreview({ card: card(100, 300), viewport, bounds: narrow })
    expect(place.width).toBe(300)
    expect(place.left).toBe(100)
  })
})

describe('growFrom', () => {
  it('scales the panel down onto its card, centre on centre', () => {
    const panel = { left: 530, top: 260, width: 420, height: 400 }
    const from = growFrom(card(600, 300), panel)
    expect(from.scale).toBeCloseTo(280 / 420)
    expect(from.x).toBeCloseTo(600 + 140 - (530 + 210))
    expect(from.y).toBeCloseTo(300 + 78.75 - (260 + 200))
  })
})

describe('parseTime', () => {
  it('reads milliseconds and seconds, with a fallback', () => {
    expect(parseTime('450ms', 1)).toBe(450)
    expect(parseTime(' 0.2s ', 1)).toBe(200)
    expect(parseTime('', 7)).toBe(7)
    expect(parseTime('soon', 7)).toBe(7)
  })
})

describe('createPreviewTimer', () => {
  const onOpen = vi.fn()
  const onClose = vi.fn()
  const timer = () =>
    createPreviewTimer<string>({ openDelay: 450, closeDelay: 150, onOpen, onClose })

  beforeEach(() => {
    vi.useFakeTimers()
    onOpen.mockClear()
    onClose.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('opens only after the pointer has rested on the card', () => {
    const t = timer()
    t.enterCard('a')
    vi.advanceTimersByTime(449)
    expect(onOpen).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onOpen).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('does not open if the pointer leaves first', () => {
    const t = timer()
    t.enterCard('a')
    vi.advanceTimersByTime(300)
    t.leaveCard()
    vi.advanceTimersByTime(1000)
    expect(onOpen).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps counting while the pointer moves inside the same card', () => {
    const t = timer()
    t.enterCard('a')
    vi.advanceTimersByTime(300)
    t.enterCard('a')
    vi.advanceTimersByTime(150)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('closes after the grace time once the pointer left the card', () => {
    const t = timer()
    t.enterCard('a')
    vi.advanceTimersByTime(450)
    t.leaveCard()
    vi.advanceTimersByTime(149)
    expect(onClose).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open when the pointer crosses from the card to the panel', () => {
    const t = timer()
    t.enterCard('a')
    vi.advanceTimersByTime(450)
    t.leaveCard()
    vi.advanceTimersByTime(100)
    t.enterPanel()
    vi.advanceTimersByTime(1000)
    expect(onClose).not.toHaveBeenCalled()
    t.leavePanel()
    vi.advanceTimersByTime(150)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open when the pointer comes back from the panel to the card', () => {
    const t = timer()
    t.enterCard('a')
    vi.advanceTimersByTime(450)
    t.leavePanel()
    vi.advanceTimersByTime(100)
    t.enterCard('a')
    vi.advanceTimersByTime(1000)
    expect(onClose).not.toHaveBeenCalled()
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('replaces the open preview when another card opens, without closing in between', () => {
    const t = timer()
    t.enterCard('a')
    vi.advanceTimersByTime(450)
    t.leaveCard()
    t.enterCard('b')
    vi.advanceTimersByTime(450)
    expect(onOpen.mock.calls).toEqual([['a'], ['b']])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes at once, and cancels one that was waiting to open', () => {
    const t = timer()
    t.enterCard('a')
    vi.advanceTimersByTime(450)
    t.close()
    expect(onClose).toHaveBeenCalledTimes(1)
    t.enterCard('b')
    vi.advanceTimersByTime(200)
    t.close()
    vi.advanceTimersByTime(1000)
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
