import type { Short } from '@fenaki/cms/types'
import { describe, expect, it } from 'vitest'
import type { PublishedShort } from '../src/lib/cms.ts'
import { previewEnabled, rankedShorts, topTen, TOP_SIZE } from '../src/lib/ranking.ts'

const short = (id: number, status = 'published') =>
  ({ id, slug: `s-${id}`, title: `Short ${id}`, status }) as unknown as PublishedShort

const shorts = (count: number, from = 1) => Array.from({ length: count }, (_, i) => short(from + i))

describe('rankedShorts', () => {
  it('keeps the order and drops unpublished, unpopulated and repeated shorts', () => {
    const ranking = { shorts: [short(3), 7, short(1, 'withdrawn'), short(2), short(3)] }
    expect(rankedShorts(ranking as { shorts: (number | Short)[] }).map((s) => s.id)).toEqual([3, 2])
  })

  it('is empty without a ranking', () => {
    expect(rankedShorts(null)).toEqual([])
    expect(rankedShorts({ shorts: null })).toEqual([])
  })
})

describe('topTen', () => {
  const latest = shorts(12, 100)

  it('shows the computed ranking when it has ten shorts', () => {
    const ranked = shorts(TOP_SIZE)
    expect(topTen({ ranked, latest, preview: false })).toEqual(ranked)
  })

  it('shows nothing for a ranking of fewer than ten, preview or not', () => {
    expect(topTen({ ranked: shorts(9), latest, preview: false })).toEqual([])
    expect(topTen({ ranked: [], latest, preview: false })).toEqual([])
  })

  it('stands in the ten latest shorts only in preview', () => {
    expect(topTen({ ranked: [], latest, preview: true })).toEqual(latest.slice(0, TOP_SIZE))
    expect(topTen({ ranked: [], latest: shorts(9), preview: true })).toEqual([])
  })

  it('prefers the real ranking over the preview', () => {
    const ranked = shorts(TOP_SIZE)
    expect(topTen({ ranked, latest, preview: true })).toEqual(ranked)
  })
})

describe('previewEnabled', () => {
  it('is never on in production', () => {
    expect(previewEnabled(true, false)).toBe(true)
    expect(previewEnabled(true, true)).toBe(false)
    expect(previewEnabled(false, false)).toBe(false)
  })
})
