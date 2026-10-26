import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueue, resetPageState } from '../src/lib/accountClient.ts'
import * as list from '../src/lib/myList.ts'
import * as ratings from '../src/lib/myRatings.ts'
import { hasLocalData, mergeLocalIntoAccount } from '../src/lib/accountSync.ts'

interface Call {
  path: string
  method: string
  body: Record<string, unknown>
}

/** A browser with a signed-in viewer: the page's state, localStorage and a server that answers. */
function browser(options: {
  signedIn: boolean
  state?: { list: { slug: string; savedAt: number }[]; ratings: Record<string, string> }
  respond?: (call: Call) => { status: number; body?: unknown }
}) {
  const calls: Call[] = []
  const data = new Map<string, string>()
  const events = new EventTarget()
  vi.stubGlobal('window', events)
  vi.stubGlobal('CustomEvent', CustomEvent)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
  vi.stubGlobal('document', {
    body: { dataset: options.signedIn ? { signedIn: 'true' } : {} },
    documentElement: { lang: 'es' },
    getElementById: () => (options.state ? { textContent: JSON.stringify(options.state) } : null),
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const call: Call = {
        path: url.replace('/api/account/', ''),
        method: String(init.method),
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
      }
      calls.push(call)
      const { status, body } = options.respond?.(call) ?? { status: 200, body: { ok: true } }
      return Response.json(body ?? {}, { status })
    }),
  )
  return { calls, data, events }
}

const item = (slug: string) => ({
  slug,
  title: slug.toUpperCase(),
  seconds: 600,
  tone: 'sala' as const,
})
/** Lets the queued requests and their follow-ups run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  vi.unstubAllGlobals()
  list.resetMemory()
  ratings.resetMemory()
  resetPageState()
})

describe('«Mi lista» signed in', () => {
  it('starts from what the server rendered into the page', () => {
    browser({
      signedIn: true,
      state: {
        list: [
          { slug: 'cuerdas', savedAt: 5 },
          { slug: 'alike', savedAt: 3 },
        ],
        ratings: {},
      },
    })
    expect(list.readList().map((i) => i.slug)).toEqual(['cuerdas', 'alike'])
    expect(list.has('cuerdas')).toBe(true)
    expect(list.has('madre')).toBe(false)
  })

  it('shows a save at once, tells the account, and keeps the browser storage out of it', async () => {
    const { calls, data } = browser({ signedIn: true, state: { list: [], ratings: {} } })
    const changed = vi.fn()
    list.subscribe(changed)
    list.add(item('madre'))
    expect(list.has('madre')).toBe(true)
    expect(changed).toHaveBeenCalledTimes(1)
    await settle()
    expect(calls).toEqual([{ path: 'list', method: 'PUT', body: { slug: 'madre', locale: 'es' } }])
    expect(data.size).toBe(0)
  })

  it('removes a short, and undoes it when the account says no', async () => {
    const { calls } = browser({
      signedIn: true,
      state: {
        list: [
          { slug: 'cuerdas', savedAt: 5 },
          { slug: 'alike', savedAt: 3 },
        ],
        ratings: {},
      },
      respond: () => ({ status: 503, body: { error: 'server' } }),
    })
    list.remove('cuerdas')
    expect(list.has('cuerdas')).toBe(false)
    await settle()
    expect(calls[0]).toMatchObject({ method: 'DELETE', body: { slug: 'cuerdas' } })
    // Back where it was, in its place.
    expect(list.readList().map((i) => i.slug)).toEqual(['cuerdas', 'alike'])
  })

  it('undoes a save that fails', async () => {
    browser({
      signedIn: true,
      state: { list: [], ratings: {} },
      respond: () => ({ status: 404, body: { error: 'not_found' } }),
    })
    list.add(item('fantasma'))
    expect(list.has('fantasma')).toBe(true)
    await settle()
    expect(list.has('fantasma')).toBe(false)
  })

  it('sends changes in the order they were made', async () => {
    const { calls } = browser({ signedIn: true, state: { list: [], ratings: {} } })
    list.add(item('a'))
    list.add(item('b'))
    list.remove('a')
    await settle()
    await settle()
    expect(calls.map((c) => `${c.method} ${String(c.body.slug)}`)).toEqual([
      'PUT a',
      'PUT b',
      'DELETE a',
    ])
  })
})

describe('«Mi lista» signed out', () => {
  it('keeps using localStorage and never calls the server', async () => {
    const { calls, data } = browser({ signedIn: false })
    list.add(item('madre'))
    await settle()
    expect(list.has('madre')).toBe(true)
    expect(data.has(list.STORAGE_KEY)).toBe(true)
    expect(calls).toHaveLength(0)
  })
})

describe('ratings signed in', () => {
  it('reads the page state, rates and clears through the account, and undoes failures', async () => {
    const { calls } = browser({
      signedIn: true,
      state: { list: [], ratings: { madre: 'like' } },
    })
    expect(ratings.getRating('madre')).toBe('like')
    ratings.setRating('madre', 'love')
    expect(ratings.getRating('madre')).toBe('love')
    ratings.setRating('alike', 'dislike')
    ratings.setRating('alike', undefined)
    expect(ratings.getRating('alike')).toBeUndefined()
    await settle()
    await settle()
    await settle()
    expect(
      calls.map((c) => `${c.method} ${String(c.body.slug)} ${String(c.body.value ?? '')}`.trim()),
    ).toEqual(['PUT madre love', 'PUT alike dislike', 'DELETE alike'])
  })

  it('goes back to the previous rating when the account refuses', async () => {
    browser({
      signedIn: true,
      state: { list: [], ratings: { madre: 'like' } },
      respond: () => ({ status: 503, body: { error: 'server' } }),
    })
    ratings.setRating('madre', 'love')
    expect(ratings.getRating('madre')).toBe('love')
    await settle()
    expect(ratings.getRating('madre')).toBe('like')
  })
})

describe('merging the browser into the account', () => {
  it('sends the list and ratings kept here, then forgets them', async () => {
    const { calls, data } = browser({ signedIn: false })
    list.add(item('madre'))
    ratings.setRating('madre', 'love')
    expect(hasLocalData()).toBe(true)

    expect(await mergeLocalIntoAccount('es')).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.path).toBe('merge')
    expect(calls[0]?.body).toMatchObject({
      list: [{ slug: 'madre' }],
      ratings: { madre: 'love' },
      locale: 'es',
    })
    expect(data.size).toBe(0)
    expect(hasLocalData()).toBe(false)
  })

  it('keeps what is here if the account could not take it', async () => {
    browser({ signedIn: false, respond: () => ({ status: 503, body: { error: 'server' } }) })
    list.add(item('madre'))
    expect(await mergeLocalIntoAccount('es')).toBe(false)
    expect(hasLocalData()).toBe(true)
  })

  it('does nothing when there is nothing to merge', async () => {
    const { calls } = browser({ signedIn: false })
    expect(await mergeLocalIntoAccount('es')).toBe(true)
    expect(calls).toHaveLength(0)
  })
})

describe('createQueue', () => {
  it('runs one at a time, in order, even after a failure', async () => {
    const queue = createQueue()
    const order: string[] = []
    const slow = queue(async () => {
      await settle()
      order.push('slow')
    })
    const failing = queue(async () => {
      order.push('failing')
      throw new Error('x')
    })
    const last = queue(async () => void order.push('last'))
    await expect(failing).rejects.toThrow()
    await Promise.all([slow, last])
    expect(order).toEqual(['slow', 'failing', 'last'])
  })
})
