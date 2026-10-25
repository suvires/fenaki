import { describe, expect, it } from 'vitest'
import {
  collectionData,
  collectionStatus,
  parseImportFile,
  shortData,
  shortStatus,
  type ImportCollection,
  type ImportFile,
  type ImportShort,
  type ImportSource,
} from '../src/import/catalog.ts'

/** A made-up catalog in the shape of the real import file. */
function catalog(): ImportFile {
  return {
    version: 1,
    locale: 'es',
    people: [{ key: 'ana-ruiz', name: 'Ana Ruiz', slug: 'ana-ruiz' }],
    licenses: [{ key: 'yt', name: 'YouTube embed', route: 'embed', type: 'platform-terms' }],
    shorts: [
      {
        key: 'la-espera',
        es: { title: 'La espera', slug: 'la-espera', synopsis: 'Una estación vacía.' },
        durationSeconds: 300,
        type: 'fiction',
        credits: [{ personKey: 'ana-ruiz', role: 'director' }],
        _import: { launch: true, brandedContent: false, brand: null },
      },
      {
        key: 'el-anuncio',
        es: { title: 'El anuncio', slug: 'el-anuncio' },
        durationSeconds: 120,
        type: 'fiction',
        _import: { launch: false, brandedContent: true, brand: 'Marca Ficticia' },
      },
    ],
    sources: [
      {
        key: 'la-espera:youtube',
        shortKey: 'la-espera',
        provider: 'youtube',
        externalId: 'abc',
        licenseKey: 'yt',
      },
    ],
    collections: [
      {
        key: 'esperas',
        es: { title: 'Esperas', slug: 'esperas' },
        shortKeys: ['la-espera', 'el-anuncio'],
      },
    ],
  }
}

describe('parseImportFile', () => {
  it('accepts a consistent file', () => {
    expect(parseImportFile(catalog(), 'es').shorts).toHaveLength(2)
  })

  it('rejects another locale or version', () => {
    expect(() => parseImportFile({ ...catalog(), locale: 'en' }, 'es')).toThrow(/locale/)
    expect(() => parseImportFile({ ...catalog(), version: 2 }, 'es')).toThrow(/version/)
  })

  it('lists every broken reference and duplicate key', () => {
    const file = catalog()
    const [source] = file.sources as [ImportSource]
    const [collection] = file.collections as [ImportCollection]
    source.licenseKey = 'missing-license'
    collection.shortKeys.push('missing-short')
    file.people.push({ key: 'ana-ruiz', name: 'Ana Ruiz', slug: 'ana-ruiz' })
    const message = (() => {
      try {
        parseImportFile(file, 'es')
        return ''
      } catch (error) {
        return (error as Error).message
      }
    })()
    expect(message).toContain('duplicate key "ana-ruiz"')
    expect(message).toContain('license "missing-license"')
    expect(message).toContain('short "missing-short"')
  })

  it('refuses sponsors, which are entered in the admin panel', () => {
    const file = catalog()
    const [collection] = file.collections as [ImportCollection]
    collection.sponsorKey = 'acme'
    expect(() => parseImportFile(file, 'es')).toThrow(/sponsors are not imported/)
  })
})

describe('shortStatus', () => {
  const [launch, later] = catalog().shorts as [ImportShort, ImportShort]

  it('publishes launch shorts and keeps the rest as drafts', () => {
    expect(shortStatus(launch)).toBe('published')
    expect(shortStatus(later)).toBe('draft')
    expect(shortStatus(later, 'published')).toBe('draft')
  })

  it('never brings back a withdrawn short', () => {
    expect(shortStatus(launch, 'withdrawn')).toBe('withdrawn')
  })
})

describe('shortData', () => {
  const [launch, branded] = catalog().shorts as [ImportShort, ImportShort]
  const ids = (key: string) => ({ 'ana-ruiz': 7 })[key] ?? 0

  it('maps localized fields and credits, and drops the _import provenance', () => {
    const data = shortData(launch, ids, 'published')
    expect(data).toMatchObject({
      title: 'La espera',
      slug: 'la-espera',
      credits: [{ person: 7, role: 'director' }],
      brandedContent: false,
      brand: null,
      sample: false,
      importKey: 'la-espera',
    })
    expect(data).not.toHaveProperty('_import')
  })

  it('carries the branded content flag and brand', () => {
    expect(shortData(branded, ids, 'draft')).toMatchObject({
      brandedContent: true,
      brand: 'Marca Ficticia',
    })
  })
})

describe('collections', () => {
  const [collection] = catalog().collections as [ImportCollection]

  it('are published when one of their shorts is', () => {
    expect(collectionStatus(collection, new Set(['la-espera']))).toBe('published')
    expect(collectionStatus(collection, new Set())).toBe('draft')
  })

  it('keep the display order of their shorts', () => {
    const ids = (key: string) => ({ 'la-espera': 1, 'el-anuncio': 2 })[key] ?? 0
    expect(collectionData(collection, ids, 'published').shorts).toEqual([1, 2])
  })
})
