import { describe, expect, it } from 'vitest'
import {
  browseHref,
  browseQueries,
  meiliFilter,
  mergeFacets,
  parseBrowseParams,
  toggleHref,
} from '../src/lib/browse.ts'

const params = (query: string) => new URLSearchParams(query)

describe('parseBrowseParams', () => {
  it('reads valid filters and the page', () => {
    expect(parseBrowseParams(params('duration=mid&lang=es&subs=es&country=MX&page=2'))).toEqual({
      filters: { duration: 'mid', lang: 'es', subs: 'es', country: 'MX' },
      page: 2,
    })
  })

  it('drops anything that could reach the search engine malformed', () => {
    expect(
      parseBrowseParams(params('duration=forever&country=es&type="x" OR 1&lang=e"s&page=-3')),
    ).toEqual({ filters: {}, page: 1 })
  })
})

describe('browse URLs', () => {
  it('give one URL per combination, whatever the order', () => {
    expect(browseHref('/es/cortos', { type: 'fiction', duration: 'short' })).toBe(
      '/es/cortos?duration=short&type=fiction',
    )
    expect(browseHref('/es/cortos', {}, 3)).toBe('/es/cortos?page=3')
    expect(browseHref('/es/cortos', {})).toBe('/es/cortos')
  })

  it('toggle one filter and go back to the first page', () => {
    const filters = { duration: 'short', form: 'animation' }
    expect(toggleHref('/es/cortos', filters, 'duration', 'long')).toBe(
      '/es/cortos?duration=long&form=animation',
    )
    expect(toggleHref('/es/cortos', filters, 'duration', 'short')).toBe('/es/cortos?form=animation')
  })
})

describe('Meilisearch queries', () => {
  it('quote every value', () => {
    expect(meiliFilter({ duration: 'mid', country: 'ES' })).toEqual([
      'durationBand = "mid"',
      'country = "ES"',
    ])
    expect(meiliFilter({ duration: 'mid', country: 'ES' }, 'country')).toEqual([
      'durationBand = "mid"',
    ])
  })

  it('ask for each active filter’s counts without it', () => {
    const queries = browseQueries('shorts_es', { duration: 'mid', form: 'animation' }, 2)
    expect(queries).toHaveLength(3)
    expect(queries[0]).toMatchObject({
      page: 2,
      filter: ['durationBand = "mid"', 'form = "animation"'],
    })
    expect(queries[1]).toMatchObject({ filter: ['form = "animation"'], facets: ['durationBand'] })
    expect(queries[2]).toMatchObject({ filter: ['durationBand = "mid"'], facets: ['form'] })
  })

  it('merge the counts', () => {
    const merged = mergeFacets(
      { duration: 'mid' },
      { durationBand: { mid: 5 }, form: { animation: 2, 'live-action': 3 } },
      [{ durationBand: { short: 4, mid: 5, long: 1 } }],
    )
    expect(merged).toEqual({
      durationBand: { short: 4, mid: 5, long: 1 },
      form: { animation: 2, 'live-action': 3 },
    })
  })
})
