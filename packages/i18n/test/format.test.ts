import { describe, expect, it } from 'vitest'
import {
  formatCountry,
  formatDate,
  formatDuration,
  formatLanguage,
  formatList,
  formatListParts,
  formatNumber,
  formatWeekday,
  formatYear,
} from '../src/index.ts'

describe('formatDuration', () => {
  it('rounds to whole minutes with the short unit', () => {
    expect(formatDuration(900, 'es')).toBe('15 min')
    expect(formatDuration(1440, 'es')).toBe('24 min')
    expect(formatDuration(629, 'es')).toBe('10 min')
  })

  it('never shows less than one minute', () => {
    expect(formatDuration(0, 'es')).toBe('1 min')
    expect(formatDuration(20, 'es')).toBe('1 min')
  })
})

describe('numbers and dates', () => {
  it('groups thousands the Spanish way', () => {
    expect(formatNumber(1234567, 'es')).toBe('1.234.567')
  })

  it('never groups a year', () => {
    expect(formatYear(2016, 'es')).toBe('2016')
  })

  it('formats dates in UTC', () => {
    expect(formatDate('2026-10-25T00:00:00Z', 'es')).toBe('25 de octubre de 2026')
  })
})

describe('display names and lists', () => {
  it('names countries and languages', () => {
    expect(formatCountry('ES', 'es')).toBe('España')
    expect(formatCountry('mx', 'es')).toBe('México')
    expect(formatLanguage('es', 'es')).toBe('español')
  })

  it('joins names with «y»', () => {
    expect(formatList(['Daniel Martínez Lara', 'Rafa Cano Méndez'], 'es')).toBe(
      'Daniel Martínez Lara y Rafa Cano Méndez',
    )
  })
})

describe('formatWeekday', () => {
  it('names ISO weekdays in the locale', () => {
    expect(formatWeekday(1, 'es')).toBe('lunes')
    expect(formatWeekday(4, 'es')).toBe('jueves')
    expect(formatWeekday(7, 'es')).toBe('domingo')
  })
})

describe('formatListParts', () => {
  it('keeps the items apart from the words that join them', () => {
    expect(formatListParts(['Ana', 'Luis', 'Marta'], 'es')).toEqual([
      { type: 'element', value: 'Ana' },
      { type: 'literal', value: ', ' },
      { type: 'element', value: 'Luis' },
      { type: 'literal', value: ' y ' },
      { type: 'element', value: 'Marta' },
    ])
  })
})
