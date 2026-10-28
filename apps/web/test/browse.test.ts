import { describe, expect, it } from 'vitest'
import {
  browseHref,
  browseQueries,
  filterCount,
  filterCounts,
  meiliFilter,
  parseBrowseParams,
  toggleHref,
} from '../src/lib/browse.ts'

const params = (query: string) => new URLSearchParams(query)

describe('parseBrowseParams', () => {
  it('reads valid filters, several values, the order and the page', () => {
    expect(
      parseBrowseParams(
        params('genre=horror,thriller&lang=es&subs=es&country=MX&sort=year&page=2'),
      ),
    ).toEqual({
      filters: { genre: ['horror', 'thriller'], lang: ['es'], subs: ['es'], country: ['MX'] },
      sort: 'year',
      page: 2,
    })
  })

  it('drops anything that could reach the search engine malformed', () => {
    expect(
      parseBrowseParams(
        params(
          'duration=forever&country=es&type="x" OR 1&lang=e"s&decade=1995&awards=yes&sort=x&page=-3',
        ),
      ),
    ).toEqual({ filters: {}, sort: 'newest', page: 1 })
  })

  it('keeps the valid values of a list and drops repeats', () => {
    expect(parseBrowseParams(params('genre=horror,nope,horror,drama')).filters).toEqual({
      genre: ['horror', 'drama'],
    })
  })
})

describe('browse URLs', () => {
  it('give one URL per combination, whatever the order', () => {
    expect(
      browseHref('/es/cortos', { filters: { type: ['fiction'], genre: ['thriller', 'horror'] } }),
    ).toBe('/es/cortos?genre=horror,thriller&type=fiction')
    expect(browseHref('/es/cortos', { filters: {}, sort: 'shortest' }, 3)).toBe(
      '/es/cortos?sort=shortest&page=3',
    )
    expect(browseHref('/es/cortos', { filters: {}, sort: 'newest' })).toBe('/es/cortos')
  })

  it('add or take out one value and go back to the first page', () => {
    const state = { filters: { genre: ['horror'], awards: ['1'] } }
    expect(toggleHref('/es/cortos', state, 'genre', 'drama')).toBe(
      '/es/cortos?genre=drama,horror&awards=1',
    )
    expect(toggleHref('/es/cortos', state, 'genre', 'horror')).toBe('/es/cortos?awards=1')
  })

  it('count the chosen values', () => {
    expect(filterCount({ genre: ['horror', 'drama'], awards: ['1'] })).toBe(3)
  })
})

describe('Meilisearch queries', () => {
  it('OR the values of a filter and AND the filters', () => {
    expect(meiliFilter({ genre: ['horror', 'drama'], country: ['ES'] })).toEqual([
      'genres IN ["horror","drama"]',
      'country IN ["ES"]',
    ])
    expect(meiliFilter({ duration: ['mid'], country: ['ES'] }, 'country')).toEqual([
      'durationBand IN ["mid"]',
    ])
  })

  it('turn regions, decades and toggles into their expressions', () => {
    expect(meiliFilter({ region: ['spain'] })).toEqual(['country IN ["ES"]'])
    expect(meiliFilter({ decade: ['1990', '2010'] })).toEqual([
      '(year 1990 TO 1999 OR year 2010 TO 2019)',
    ])
    expect(meiliFilter({ awards: ['1'], nodialogue: ['1'] })).toEqual([
      'noDialogue = true',
      'hasAwards = true',
    ])
  })

  it('ask for each active filter’s counts without it, in the chosen order', () => {
    const queries = browseQueries(
      'shorts_es',
      { filters: { duration: ['mid'], genre: ['horror'] }, sort: 'shortest' },
      2,
    )
    expect(queries).toHaveLength(3)
    expect(queries[0]).toMatchObject({
      page: 2,
      sort: ['durationSeconds:asc', 'publishedAt:desc'],
      filter: ['genres IN ["horror"]', 'durationBand IN ["mid"]'],
    })
    expect(queries[1]).toMatchObject({ filter: ['durationBand IN ["mid"]'], facets: ['genres'] })
    expect(queries[2]).toMatchObject({ filter: ['genres IN ["horror"]'], facets: ['durationBand'] })
  })

  it('count each filter in its own values', () => {
    const counts = filterCounts(
      { region: ['spain'] },
      {
        durationBand: { mid: 5 },
        country: { ES: 4 },
        year: { '1994': 1, '1999': 2, '2003': 1 },
        hasAwards: { true: 3, false: 1 },
      },
      [{ country: { ES: 4, MX: 2, FR: 1 } }],
    )
    expect(counts.duration).toEqual({ mid: 5 })
    expect(counts.country).toEqual({ ES: 4 })
    expect(counts.region).toEqual({ 'latin-america': 2, spain: 4, europe: 5 })
    expect(counts.decade).toEqual({ '1990': 3, '2000': 1 })
    expect(counts.awards).toEqual({ 1: 3 })
  })
})
