import { describe, expect, it } from 'vitest'
import { PAGE_SIZE, pageCount, pageHref, pageOf, parsePage } from '../src/lib/paging.ts'

const params = (query: string) => new URLSearchParams(query)
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('paging', () => {
  it('reads the page from the URL and ignores anything else', () => {
    expect(parsePage(params(''))).toBe(1)
    expect(parsePage(params('page=3'))).toBe(3)
    for (const bad of ['page=0', 'page=1', 'page=-2', 'page=2.5', 'page=abc', 'page=5000'])
      expect(parsePage(params(bad))).toBe(1)
  })

  it('leaves the parameter out of the first page', () => {
    expect(pageHref('/es/mi-lista', 1)).toBe('/es/mi-lista')
    expect(pageHref('/es/mi-lista', 2)).toBe('/es/mi-lista?page=2')
  })

  it('splits a list into pages of twenty, and past the end gives the last', () => {
    expect(pageCount(0)).toBe(1)
    expect(pageCount(PAGE_SIZE)).toBe(1)
    expect(pageCount(PAGE_SIZE + 1)).toBe(2)
    expect(pageOf(range(45), 1).items).toEqual(range(20))
    expect(pageOf(range(45), 3)).toEqual({ items: [40, 41, 42, 43, 44], page: 3, pages: 3 })
    expect(pageOf(range(45), 9).page).toBe(3)
    expect(pageOf([], 2)).toEqual({ items: [], page: 1, pages: 1 })
  })
})
