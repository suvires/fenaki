import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as ratings from '../src/lib/myRatings.ts'

function stubStorage(overrides: Partial<Storage> = {}) {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    ...overrides,
  })
  return data
}

beforeEach(() => {
  vi.unstubAllGlobals()
  ratings.resetMemory()
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('CustomEvent', CustomEvent)
})

describe('my ratings storage', () => {
  it('starts empty and keeps each short rating', () => {
    stubStorage()
    expect(ratings.readRatings()).toEqual({})
    ratings.setRating('a', 'like')
    ratings.setRating('b', 'love')
    expect(ratings.getRating('a')).toBe('like')
    expect(ratings.getRating('b')).toBe('love')
    expect(ratings.getRating('z')).toBeUndefined()
  })

  it('saves under the versioned key as slug to rating', () => {
    const data = stubStorage()
    ratings.setRating('a', 'dislike')
    expect(JSON.parse(data.get('fenaki:my-ratings:v1') ?? '{}')).toEqual({ a: 'dislike' })
  })

  it('changes a rating and clears it with undefined', () => {
    stubStorage()
    ratings.setRating('a', 'like')
    ratings.setRating('a', 'love')
    expect(ratings.getRating('a')).toBe('love')
    ratings.setRating('a', undefined)
    expect(ratings.readRatings()).toEqual({})
  })

  it('keeps the newest ratings past the cap', () => {
    stubStorage()
    for (let i = 0; i <= ratings.MAX_ITEMS; i++) ratings.setRating(`s${i}`, 'like')
    const slugs = Object.keys(ratings.readRatings())
    expect(slugs).toHaveLength(ratings.MAX_ITEMS)
    expect(slugs).not.toContain('s0')
    expect(slugs).toContain(`s${ratings.MAX_ITEMS}`)
  })

  it('treats corrupt storage as no ratings and drops unknown values', () => {
    const data = stubStorage()
    data.set('fenaki:my-ratings:v1', '{nope')
    expect(ratings.readRatings()).toEqual({})
    data.set('fenaki:my-ratings:v1', JSON.stringify(['like']))
    expect(ratings.readRatings()).toEqual({})
    data.set('fenaki:my-ratings:v1', JSON.stringify({ a: 'like', b: 'meh', c: 3 }))
    expect(ratings.readRatings()).toEqual({ a: 'like' })
  })

  it('falls back to memory when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    ratings.setRating('a', 'like')
    expect(ratings.getRating('a')).toBe('like')
  })

  it('tells subscribers about changes and stops when unsubscribed', () => {
    stubStorage()
    const callback = vi.fn()
    const stop = ratings.subscribe(callback)
    ratings.setRating('a', 'like')
    expect(callback).toHaveBeenCalledTimes(1)
    stop()
    ratings.setRating('a', 'love')
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
