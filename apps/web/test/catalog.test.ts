import { createTranslator } from '@fenaki/i18n'
import { describe, expect, it } from 'vitest'
import {
  badgesFor,
  durationBand,
  isNew,
  posterTone,
  toCard,
  type CardSource,
} from '../src/lib/catalog.ts'
import { embedUrl } from '../src/lib/embed.ts'

const t = createTranslator('es')
const NOW = Date.parse('2026-10-25T12:00:00Z')
const LAUNCH = Date.parse('2026-10-01T00:00:00Z')
const launched = { now: NOW, launchedAt: LAUNCH }

const short: CardSource = {
  slug: 'alike',
  title: 'Alike',
  synopsis: 'Un padre y su hijo.',
  directors: ['Daniel Martínez Lara', 'Rafa Cano Méndez'],
  year: 2015,
  durationSeconds: 480,
  posterTone: 'sala',
  type: 'animation',
  noDialogue: true,
  subtitles: [],
  publishedAt: '2026-09-18T10:00:00.000Z',
}

describe('durationBand', () => {
  it('splits at 5 and 15 minutes', () => {
    expect(durationBand(299)).toBe('short')
    expect(durationBand(300)).toBe('mid')
    expect(durationBand(900)).toBe('mid')
    expect(durationBand(901)).toBe('long')
  })
})

describe('isNew', () => {
  it('marks shorts published after the launch, for 30 days', () => {
    expect(isNew('2026-10-20T10:00:00Z', launched)).toBe(true)
    expect(isNew('2026-10-20T10:00:00Z', { ...launched, now: NOW + 30 * 86_400_000 })).toBe(false)
    expect(isNew(null, launched)).toBe(false)
  })

  it('never marks the catalog published before the launch', () => {
    expect(isNew('2026-09-30T23:59:59Z', launched)).toBe(false)
  })

  it('marks nothing before the launch, or without a launch date', () => {
    expect(isNew('2026-10-20T10:00:00Z', { now: NOW, launchedAt: undefined })).toBe(false)
    expect(isNew('2026-10-20T10:00:00Z', { now: NOW, launchedAt: NOW + 1 })).toBe(false)
  })
})

describe('badgesFor', () => {
  it('orders new, subtitles in the locale, then form, and keeps three at most', () => {
    const badges = badgesFor(
      { ...short, publishedAt: '2026-10-20T10:00:00Z', subtitles: ['es', 'en'] },
      'es',
      t,
      launched,
    )
    expect(badges).toEqual([
      { label: 'Nuevo', tone: 'accent' },
      { label: 'Sub ES', tone: 'info' },
      { label: 'Sin diálogos' },
    ])
  })

  it('always puts branded content first, even with three other badges', () => {
    const badges = badgesFor(
      {
        ...short,
        brandedContent: true,
        publishedAt: '2026-10-20T10:00:00Z',
        subtitles: ['es'],
      },
      'es',
      t,
      launched,
    )
    expect(badges).toEqual([
      { label: 'Contenido de marca', tone: 'branded' },
      { label: 'Nuevo', tone: 'accent' },
      { label: 'Sub ES', tone: 'info' },
    ])
  })

  it('falls back to the animation badge when the short has dialogue', () => {
    expect(badgesFor({ ...short, noDialogue: false }, 'es', t, launched)).toEqual([
      { label: 'Animación' },
    ])
  })
})

describe('toCard', () => {
  it('joins directors with Intl.ListFormat and links to the short', () => {
    const card = toCard(short, 'es', t, '/es/cortos/alike', launched)
    expect(card.director).toBe('Daniel Martínez Lara y Rafa Cano Méndez')
    expect(card.href).toBe('/es/cortos/alike')
    expect(card.seconds).toBe(480)
    expect(card.synopsis).toBe('Un padre y su hijo.')
  })

  it('only accepts product poster tones', () => {
    expect(posterTone('telon')).toBe('sala')
    expect(posterTone('plata')).toBe('plata')
  })
})

describe('embedUrl', () => {
  it('uses the privacy-enhanced YouTube domain and Vimeo do-not-track', () => {
    expect(embedUrl('youtube', 'abc')).toBe(
      'https://www.youtube-nocookie.com/embed/abc?autoplay=1&rel=0',
    )
    expect(embedUrl('vimeo', '42')).toContain('dnt=1')
    expect(embedUrl('bunny', 'x')).toBeUndefined()
  })
})
