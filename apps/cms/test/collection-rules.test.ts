import { describe, expect, it } from 'vitest'
import { dailyOrder, rulesFilter } from '../src/collections/rules.ts'
import { REGION_COUNTRIES } from '@fenaki/i18n'

describe('rulesFilter', () => {
  it('leaves out every empty rule', () => {
    expect(rulesFilter(undefined)).toEqual([])
    expect(rulesFilter({ types: [], genres: null, minMinutes: null, noDialogue: false })).toEqual(
      [],
    )
  })

  it('turns each rule into a filter, all of them ANDed', () => {
    expect(
      rulesFilter({
        types: ['animation'],
        genres: ['horror', 'thriller'],
        themes: ['family'],
        channelKinds: ['school'],
        minMinutes: 2,
        maxMinutes: 5,
        yearFrom: 2015,
        yearTo: 2020,
        originalLanguage: ' ES ',
        spanishSubtitles: true,
        noDialogue: true,
        allAudiences: true,
        withAwards: true,
      }),
    ).toEqual([
      'type IN ["animation"]',
      'genres IN ["horror", "thriller"]',
      'themes IN ["family"]',
      'channelKind IN ["school"]',
      'durationSeconds >= 120',
      'durationSeconds <= 300',
      'year >= 2015',
      'year <= 2020',
      'originalLanguage = "es"',
      'subtitles = "es"',
      'noDialogue = true',
      'audience = "all"',
      'hasAwards = true',
    ])
  })

  it('joins a region with the countries given, and drops what is not a country code', () => {
    const [filter] = rulesFilter({ region: 'spain', countries: ['pt', 'Portugal', 'ES'] })
    expect(filter).toBe('country IN ["ES", "PT"]')
    const [latam] = rulesFilter({ region: 'latin-america' })
    expect(latam).toBe(
      `country IN [${REGION_COUNTRIES['latin-america'].map((c) => `"${c}"`).join(', ')}]`,
    )
  })
})

describe('dailyOrder', () => {
  it('is the same all day, changes the next one, and keeps every id', () => {
    const ids = Array.from({ length: 30 }, (_, i) => i + 1)
    const morning = dailyOrder(ids, new Date('2026-10-28T08:00:00Z'))
    expect(dailyOrder(ids, new Date('2026-10-28T22:00:00Z'))).toEqual(morning)
    expect(dailyOrder(ids, new Date('2026-10-29T08:00:00Z'))).not.toEqual(morning)
    expect([...morning].sort((a, b) => a - b)).toEqual(ids)
  })
})
