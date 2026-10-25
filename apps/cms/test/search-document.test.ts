import { describe, expect, it } from 'vitest'
import { isNonCommercial } from '../src/collections/Licenses.ts'
import { slugify } from '../src/fields/slug.ts'
import { shortsIndexName, toSearchDocument } from '../src/search/document.ts'

describe('toSearchDocument', () => {
  const short = {
    id: 4,
    slug: 'alike',
    title: 'Alike',
    synopsis: 'Un padre y su hijo.',
    durationSeconds: 480,
    year: 2015,
    country: 'ES',
    type: 'animation',
    posterTone: 'sala',
    noDialogue: true,
    publishedAt: '2026-09-18T10:00:00.000Z',
    credits: [
      { person: { name: 'Daniel Martínez Lara' }, role: 'director' },
      { person: { name: 'Rafa Cano Méndez' }, role: 'director' },
      { person: { name: 'Rafa Cano Méndez' }, role: 'writer' },
      { person: 7, role: 'composer' },
    ],
    sources: { docs: [{ subtitles: ['es', 'en'] }, { subtitles: ['es'] }, 12] },
  }

  it('flattens credits into directors and unique people', () => {
    const doc = toSearchDocument(short)
    expect(doc.directors).toEqual(['Daniel Martínez Lara', 'Rafa Cano Méndez'])
    expect(doc.people).toEqual(['Daniel Martínez Lara', 'Rafa Cano Méndez'])
  })

  it('merges subtitles from every populated source', () => {
    expect(toSearchDocument(short).subtitles).toEqual(['es', 'en'])
  })

  it('stores the publication date as a sortable timestamp', () => {
    expect(toSearchDocument(short).publishedAt).toBe(Date.parse('2026-09-18T10:00:00.000Z'))
    expect(toSearchDocument({ ...short, publishedAt: null }).publishedAt).toBeNull()
  })

  it('names one index per locale', () => {
    expect(shortsIndexName('es')).toBe('shorts_es')
  })
})

describe('slugify', () => {
  it('strips accents and punctuation', () => {
    expect(slugify('7:35 de la mañana')).toBe('7-35-de-la-manana')
    expect(slugify('  Pedro Solís García ')).toBe('pedro-solis-garcia')
  })
})

describe('isNonCommercial', () => {
  it('flags every NC Creative Commons license', () => {
    expect(isNonCommercial('cc-by-nc')).toBe(true)
    expect(isNonCommercial('cc-by-nc-sa')).toBe(true)
    expect(isNonCommercial('cc-by')).toBe(false)
    expect(isNonCommercial('platform-terms')).toBe(false)
    expect(isNonCommercial(null)).toBe(false)
  })
})
