import { describe, expect, it } from 'vitest'
import { embedUrl } from '../src/lib/embed.ts'
import {
  clock,
  createProgressTracker,
  handshake,
  parsePlayerMessage,
  resumable,
  VIMEO_ORIGIN,
  YOUTUBE_ORIGIN,
  type Progress,
} from '../src/lib/playerProgress.ts'

describe('parsePlayerMessage', () => {
  it('reads YouTube’s infoDelivery and initialDelivery (JSON strings from the youtube-nocookie origin)', () => {
    const info = { currentTime: 12.5, duration: 600, playerState: 1 }
    expect(
      parsePlayerMessage(YOUTUBE_ORIGIN, JSON.stringify({ event: 'infoDelivery', info })),
    ).toEqual({ position: 12.5, duration: 600 })
    expect(
      parsePlayerMessage(
        YOUTUBE_ORIGIN,
        JSON.stringify({ event: 'initialDelivery', info: { duration: 300 } }),
      ),
    ).toEqual({ position: undefined, duration: 300 })
  })

  it('knows when YouTube says the short ended', () => {
    expect(
      parsePlayerMessage(
        YOUTUBE_ORIGIN,
        JSON.stringify({ event: 'infoDelivery', info: { playerState: 0, currentTime: 599 } }),
      ),
    ).toMatchObject({ ended: true })
    expect(
      parsePlayerMessage(YOUTUBE_ORIGIN, JSON.stringify({ event: 'onStateChange', info: 0 })),
    ).toEqual({
      ended: true,
    })
  })

  it('reads Vimeo’s timeupdate and end events (objects or JSON strings)', () => {
    const message = { event: 'timeupdate', data: { seconds: 30.2, duration: 900, percent: 0.03 } }
    expect(parsePlayerMessage(VIMEO_ORIGIN, message)).toEqual({ position: 30.2, duration: 900 })
    expect(parsePlayerMessage(VIMEO_ORIGIN, JSON.stringify(message))).toEqual({
      position: 30.2,
      duration: 900,
    })
    expect(parsePlayerMessage(VIMEO_ORIGIN, { event: 'ended' })).toEqual({ ended: true })
  })

  it('ignores other origins, other events and nonsense', () => {
    const youtube = JSON.stringify({ event: 'infoDelivery', info: { currentTime: 1, duration: 2 } })
    expect(parsePlayerMessage('https://evil.example', youtube)).toBeUndefined()
    // Each provider's messages are only believed from its own origin.
    expect(parsePlayerMessage(VIMEO_ORIGIN, youtube)).toBeUndefined()
    expect(parsePlayerMessage(YOUTUBE_ORIGIN, JSON.stringify({ event: 'onReady' }))).toBeUndefined()
    expect(parsePlayerMessage(YOUTUBE_ORIGIN, 'not json')).toBeUndefined()
    expect(parsePlayerMessage(YOUTUBE_ORIGIN, null)).toBeUndefined()
    expect(
      parsePlayerMessage(
        YOUTUBE_ORIGIN,
        JSON.stringify({ event: 'infoDelivery', info: { currentTime: -3, duration: NaN } }),
      ),
    ).toBeUndefined()
  })
})

describe('handshake', () => {
  it('asks YouTube to start listening and Vimeo for timeupdate', () => {
    expect(handshake('youtube')).toEqual({
      origin: YOUTUBE_ORIGIN,
      message: [JSON.stringify({ event: 'listening', id: 1, channel: 'widget' })],
    })
    expect(handshake('vimeo')?.message).toContainEqual({
      method: 'addEventListener',
      value: 'timeupdate',
    })
    expect(handshake('bunny')).toBeUndefined()
  })
})

describe('createProgressTracker', () => {
  function tracker() {
    let time = 0
    const sent: { progress: Progress; final: boolean }[] = []
    const t = createProgressTracker({
      send: (progress, { final }) => sent.push({ progress, final }),
      now: () => time,
    })
    return { t, sent, at: (ms: number) => void (time = ms) }
  }

  it('saves the first progress, then at most every 15 seconds', () => {
    const { t, sent, at } = tracker()
    t.update({ position: 1, duration: 600 })
    at(5_000)
    t.update({ position: 6, duration: 600 })
    at(14_999)
    t.update({ position: 15, duration: 600 })
    expect(sent.map((s) => s.progress.position)).toEqual([1])
    at(16_000)
    t.update({ position: 17, duration: 600 })
    expect(sent.map((s) => s.progress.position)).toEqual([1, 17])
  })

  it('waits for the duration before saving anything', () => {
    const { t, sent } = tracker()
    t.update({ position: 5 })
    expect(sent).toHaveLength(0)
    t.update({ duration: 600 })
    t.update({ position: 7 })
    expect(sent).toHaveLength(1)
  })

  it('on leaving saves the newest progress once, as final', () => {
    const { t, sent, at } = tracker()
    t.update({ position: 1, duration: 600 })
    at(3_000)
    t.update({ position: 4, duration: 600 })
    t.flush()
    t.flush()
    expect(sent).toEqual([
      { progress: { position: 1, duration: 600 }, final: false },
      { progress: { position: 4, duration: 600 }, final: true },
    ])
  })

  it('saves at once when the short ends, at the full duration', () => {
    const { t, sent, at } = tracker()
    t.update({ position: 590, duration: 600 })
    at(1_000)
    t.update({ ended: true })
    expect(sent.at(-1)?.progress).toEqual({ position: 600, duration: 600 })
  })

  it('does nothing on leaving without having watched', () => {
    const { t, sent } = tracker()
    t.flush()
    expect(sent).toHaveLength(0)
  })
})

describe('resume', () => {
  it('writes timecodes', () => {
    expect(clock(204)).toBe('3:24')
    expect(clock(5)).toBe('0:05')
    expect(clock(3725)).toBe('1:02:05')
  })

  it('offers it past the first seconds and before the end', () => {
    expect(resumable(4, 600)).toBe(false)
    expect(resumable(5, 600)).toBe(true)
    expect(resumable(539, 600)).toBe(true)
    expect(resumable(540, 600)).toBe(false)
  })

  it('starts the embeds where it stopped, and follows the player only when asked', () => {
    const youtube = new URL(
      embedUrl('youtube', 'abc', { origin: 'https://fenaki.tv', start: 204.7 }) ?? '',
    )
    expect(youtube.searchParams.get('start')).toBe('204')
    expect(youtube.searchParams.get('enablejsapi')).toBe('1')
    expect(youtube.searchParams.get('origin')).toBe('https://fenaki.tv')
    expect(youtube.host).toBe('www.youtube-nocookie.com')

    const plain = new URL(embedUrl('youtube', 'abc') ?? '')
    expect(plain.searchParams.has('enablejsapi')).toBe(false)
    expect(plain.searchParams.has('start')).toBe(false)

    expect(embedUrl('vimeo', '123', { start: 90 })).toBe(
      'https://player.vimeo.com/video/123?autoplay=1&dnt=1#t=90s',
    )
    expect(embedUrl('vimeo', '123')).toBe('https://player.vimeo.com/video/123?autoplay=1&dnt=1')
    expect(embedUrl('bunny', 'x')).toBeUndefined()
  })
})
