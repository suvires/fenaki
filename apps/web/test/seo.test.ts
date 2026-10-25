import { describe, expect, it } from 'vitest'
import {
  collectionPage,
  hreflangLinks,
  isoDuration,
  jsonLdScript,
  profilePage,
  sitemapIndexXml,
  sitemapXml,
  swapLocale,
  videoObject,
} from '../src/lib/seo.ts'

const SITE = 'https://shortix.film'

describe('alternate URLs', () => {
  it('swap the locale prefix', () => {
    expect(swapLocale('/es/cortos/cuerdas', 'es')).toBe('/es/cortos/cuerdas')
    expect(swapLocale('/es/', 'es')).toBe('/es/')
  })

  it('list every locale and x-default', () => {
    expect(hreflangLinks(SITE, '/es/cortos/cuerdas')).toEqual([
      { hreflang: 'es', href: 'https://shortix.film/es/cortos/cuerdas' },
      { hreflang: 'x-default', href: 'https://shortix.film/es/cortos/cuerdas' },
    ])
  })
})

describe('structured data', () => {
  it('writes ISO 8601 durations', () => {
    expect(isoDuration(652)).toBe('PT10M52S')
    expect(isoDuration(3600)).toBe('PT1H')
    expect(isoDuration(45)).toBe('PT45S')
    expect(isoDuration(0)).toBe('PT0S')
  })

  it('describes a short as a VideoObject with absolute URLs', () => {
    const video = videoObject(SITE, {
      name: 'Cuerdas',
      description: 'Una amistad en el colegio.',
      url: '/es/cortos/cuerdas',
      thumbnailUrl: '/og/es/cortos/cuerdas.png',
      uploadDate: '2026-10-25T00:00:00.000Z',
      durationSeconds: 652,
      embedUrl: 'https://www.youtube-nocookie.com/embed/abc?rel=0',
      inLanguage: 'es',
      year: 2013,
      directors: [{ name: 'Pedro Solís García', url: '/es/personas/pedro-solis-garcia' }],
    })
    expect(video).toMatchObject({
      '@type': 'VideoObject',
      url: 'https://shortix.film/es/cortos/cuerdas',
      thumbnailUrl: ['https://shortix.film/og/es/cortos/cuerdas.png'],
      duration: 'PT10M52S',
      inLanguage: 'es',
      dateCreated: '2013',
      director: [{ '@type': 'Person', url: 'https://shortix.film/es/personas/pedro-solis-garcia' }],
    })
  })

  it('leaves out the language of a short with no dialogue', () => {
    const video = videoObject(SITE, {
      name: 'Alike',
      url: '/es/cortos/alike',
      thumbnailUrl: '/og.png',
      durationSeconds: 480,
      inLanguage: 'zxx',
      directors: [],
    })
    expect(video).not.toHaveProperty('inLanguage')
    expect(video).not.toHaveProperty('director')
    expect(video.description).toBe('Alike')
  })

  it('lists the shorts of a collection page and a person in order', () => {
    const items = [
      { name: 'A', url: '/es/cortos/a' },
      { name: 'B', url: '/es/cortos/b' },
    ]
    expect(collectionPage(SITE, { name: 'C', url: '/es/colecciones/c', items })).toMatchObject({
      '@type': 'CollectionPage',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: 2,
        itemListElement: [
          { position: 1, url: 'https://shortix.film/es/cortos/a' },
          { position: 2 },
        ],
      },
    })
    expect(profilePage(SITE, { name: 'Ana', url: '/es/personas/ana' }, items)).toMatchObject({
      '@type': 'ProfilePage',
      mainEntity: { '@type': 'Person', name: 'Ana' },
    })
  })

  it('cannot close its script tag', () => {
    expect(jsonLdScript({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>')
  })
})

describe('sitemaps', () => {
  it('list each page with its alternates and last change', () => {
    const xml = sitemapXml(SITE, 'es', [
      { paths: { es: '/es/' } },
      { paths: { es: '/es/cortos/a&b' }, lastModified: '2026-10-25T10:00:00.000Z' },
    ])
    expect(xml).toContain('<loc>https://shortix.film/es/</loc>')
    expect(xml).toContain('<loc>https://shortix.film/es/cortos/a&amp;b</loc>')
    expect(xml).toContain('<lastmod>2026-10-25T10:00:00.000Z</lastmod>')
    expect(xml).toContain('hreflang="x-default"')
  })

  it('point the index at one sitemap per locale', () => {
    expect(sitemapIndexXml(SITE)).toContain('<loc>https://shortix.film/sitemap-es.xml</loc>')
  })
})
