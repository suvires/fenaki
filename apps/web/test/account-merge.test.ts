import { describe, expect, it } from 'vitest'
import { parseIncoming, planMerge } from '../src/lib/account/merge.ts'

const entry = (slug: string, savedAt: number) => ({ slug, savedAt })
const caps = { list: 3, ratings: 2 }

describe('parseIncoming', () => {
  it('keeps valid slugs and ratings, dates in the past, and drops the rest', () => {
    const now = 10_000
    const parsed = parseIncoming(
      {
        list: [
          { slug: 'cuerdas', savedAt: 5 },
          { slug: 'futuro', savedAt: 99_999 },
          { slug: 'Bad Slug', savedAt: 1 },
          { slug: 'sin-fecha' },
          null,
        ],
        ratings: { cuerdas: 'love', alike: 'meh', 'Bad Slug': 'like' },
      },
      now,
    )
    expect(parsed.list).toEqual([
      entry('cuerdas', 5),
      entry('futuro', now),
      entry('sin-fecha', now),
    ])
    expect(parsed.ratings).toEqual({ cuerdas: 'love' })
  })

  it('ignores a body that is not shaped like a list', () => {
    expect(parseIncoming({ list: 'x', ratings: [1] })).toEqual({ list: [], ratings: {} })
    expect(parseIncoming({})).toEqual({ list: [], ratings: {} })
  })
})

describe('planMerge', () => {
  it('adds what the account does not have, oldest first, and leaves the account as it is', () => {
    const plan = planMerge(
      { list: [entry('cuerdas', 100)], ratings: { alike: 'like' } },
      {
        list: [entry('cuerdas', 5), entry('madre', 20), entry('alike', 10)],
        ratings: { alike: 'love', madre: 'dislike' },
      },
      { list: 10, ratings: 10 },
    )
    expect(plan.list).toEqual([entry('alike', 10), entry('madre', 20)])
    expect(plan.ratings).toEqual([['madre', 'dislike']])
  })

  it('keeps the newest when the list would go over its cap, and counts each short once', () => {
    const plan = planMerge(
      { list: [entry('a', 1)], ratings: {} },
      { list: [entry('x', 10), entry('y', 30), entry('x', 40), entry('z', 20)], ratings: {} },
      caps,
    )
    // Room for two more: the two newest distinct ones.
    expect(plan.list.map((e) => e.slug).sort()).toHaveLength(2)
    expect(plan.list.map((e) => e.slug)).not.toContain('a')
  })

  it('adds nothing past the rating cap', () => {
    const plan = planMerge(
      { list: [], ratings: { a: 'like', b: 'like' } },
      { list: [], ratings: { c: 'love' } },
      caps,
    )
    expect(plan.ratings).toEqual([])
  })
})
