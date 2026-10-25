import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as list from '../src/lib/myList.ts'

function stubStorage(overrides: Partial<Storage> = {}) {
  const data = new Map<string, string>()
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    ...overrides,
  }
  vi.stubGlobal('localStorage', storage)
  return data
}

const item = (slug: string) => ({
  slug,
  title: slug.toUpperCase(),
  seconds: 600,
  tone: 'sala' as const,
})

beforeEach(() => {
  vi.unstubAllGlobals()
  list.resetMemory()
  const target = new EventTarget()
  vi.stubGlobal('window', target)
  vi.stubGlobal('CustomEvent', CustomEvent)
})

describe('my list storage', () => {
  it('starts empty and saves newest first', () => {
    stubStorage()
    expect(list.readList()).toEqual([])
    list.add(item('a'))
    list.add(item('b'))
    expect(list.readList().map((i) => i.slug)).toEqual(['b', 'a'])
    expect(list.has('a')).toBe(true)
    expect(list.has('z')).toBe(false)
  })

  it('saves under the versioned key with a timestamp', () => {
    const data = stubStorage()
    list.add(item('a'))
    const stored = JSON.parse(data.get('fenaki:my-list:v1') ?? '[]')
    expect(stored[0]).toMatchObject({ slug: 'a', title: 'A', savedAt: expect.any(Number) })
  })

  it('moves a short saved again to the top without duplicating it', () => {
    stubStorage()
    list.add(item('a'))
    list.add(item('b'))
    list.add(item('a'))
    expect(list.readList().map((i) => i.slug)).toEqual(['a', 'b'])
  })

  it('removes and toggles', () => {
    stubStorage()
    expect(list.toggle(item('a'))).toBe(true)
    expect(list.toggle(item('a'))).toBe(false)
    expect(list.readList()).toEqual([])
    list.remove('nope')
  })

  it('caps the list at 200, dropping the oldest', () => {
    stubStorage()
    for (let i = 0; i < 205; i++) list.add(item(`s${i}`))
    const slugs = list.readList().map((i) => i.slug)
    expect(slugs).toHaveLength(200)
    expect(slugs[0]).toBe('s204')
    expect(slugs).not.toContain('s0')
  })

  it('treats corrupt data as an empty list', () => {
    const data = stubStorage()
    data.set('fenaki:my-list:v1', '{not json')
    expect(list.readList()).toEqual([])
    data.set('fenaki:my-list:v1', JSON.stringify([{ nope: 1 }, { ...item('a'), savedAt: 1 }]))
    expect(list.readList().map((i) => i.slug)).toEqual(['a'])
  })

  it('keeps working in memory when storage is blocked', () => {
    vi.stubGlobal('localStorage', undefined)
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    expect(list.readList()).toEqual([])
    list.add(item('a'))
    expect(list.has('a')).toBe(true)
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('keeps working when writes throw', () => {
    stubStorage({
      setItem: () => {
        throw new Error('quota')
      },
    })
    list.add(item('a'))
    expect(list.has('a')).toBe(true)
  })

  it('notifies subscribers on changes and on storage events, until unsubscribed', () => {
    stubStorage()
    const cb = vi.fn()
    const off = list.subscribe(cb)
    list.add(item('a'))
    expect(cb).toHaveBeenCalledTimes(1)
    const other = Object.assign(new Event('storage'), { key: 'fenaki:my-list:v1' })
    window.dispatchEvent(other)
    expect(cb).toHaveBeenCalledTimes(2)
    window.dispatchEvent(Object.assign(new Event('storage'), { key: 'something-else' }))
    expect(cb).toHaveBeenCalledTimes(2)
    off()
    list.add(item('b'))
    expect(cb).toHaveBeenCalledTimes(2)
  })
})

describe('withCurrent', () => {
  it('shows the catalog’s current data and drops shorts no longer published', () => {
    const saved = [
      { slug: 'a', title: 'Old', seconds: 60, tone: 'sala' as const, savedAt: 2 },
      { slug: 'gone', title: 'Gone', seconds: 60, tone: 'sala' as const, savedAt: 1 },
    ]
    const current = {
      a: {
        slug: 'a',
        title: 'New',
        seconds: 60,
        tone: 'plata' as const,
        image: 'https://x/a.webp',
        synopsis: 'Now.',
      },
    }
    expect(list.withCurrent(saved, current)).toEqual([
      {
        slug: 'a',
        title: 'New',
        seconds: 60,
        tone: 'plata',
        image: 'https://x/a.webp',
        synopsis: 'Now.',
        savedAt: 2,
      },
    ])
  })
})
