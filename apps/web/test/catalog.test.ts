import { createTranslator } from '@fenaki/i18n'
import { describe, expect, it } from 'vitest'
import { badgesFor, durationBand, posterTone, toCard, type CardSource } from '../src/lib/catalog.ts'
import { embedUrl } from '../src/lib/embed.ts'

const t = createTranslator('es')

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

describe('badgesFor', () => {
  it('orders branded content, for all audiences and no dialogue', () => {
    expect(badgesFor({ ...short, brandedContent: true, allAudiences: true }, t)).toEqual([
      { label: 'Contenido de marca', tone: 'branded' },
      { label: 'Para todos los públicos', tone: 'info' },
      { label: 'Sin diálogos' },
    ])
  })

  it('has no badge for what is new, the type or the subtitles', () => {
    const recent = { ...short, publishedAt: new Date().toISOString(), subtitles: ['es'] }
    expect(badgesFor({ ...recent, noDialogue: false }, t)).toEqual([])
  })
})

describe('toCard', () => {
  it('joins directors with Intl.ListFormat and links to the short', () => {
    const card = toCard(short, 'es', t, '/es/cortos/alike')
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
