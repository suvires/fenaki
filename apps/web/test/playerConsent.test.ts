import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetPageState } from '../src/lib/accountClient.ts'
import * as consent from '../src/lib/playerConsent.ts'

interface Call {
  path: string
  method: string
  body: Record<string, unknown>
}

/** A browser, signed in or not, with localStorage and a server that answers. */
function browser(options: {
  signedIn: boolean
  playerConsent?: string[]
  respond?: (call: Call) => { status: number; body?: unknown }
}) {
  const calls: Call[] = []
  const data = new Map<string, string>()
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('CustomEvent', CustomEvent)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
  const state = { list: [], ratings: {}, playerConsent: options.playerConsent }
  vi.stubGlobal('document', {
    body: { dataset: options.signedIn ? { signedIn: 'true' } : {} },
    documentElement: { lang: 'es' },
    getElementById: () => (options.signedIn ? { textContent: JSON.stringify(state) } : null),
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
  return { calls, data }
}

beforeEach(() => {
  vi.unstubAllGlobals()
  consent.resetMemory()
  resetPageState()
})

describe('player consent signed out', () => {
  it('asks by default, and remembers and forgets in this browser only', async () => {
    const { calls, data } = browser({ signedIn: false })
    expect(consent.savedIn()).toBe('browser')
    expect(consent.isRemembered('youtube')).toBe(false)
    expect(await consent.setRemembered('youtube', true)).toBe(true)
    expect(consent.isRemembered('youtube')).toBe(true)
    expect(consent.isRemembered('vimeo')).toBe(false)
    expect(JSON.parse(data.get(consent.STORAGE_KEY) ?? '{}')).toEqual({ youtube: true })
    await consent.setRemembered('youtube', false)
    expect(consent.isRemembered('youtube')).toBe(false)
    expect(data.has(consent.STORAGE_KEY)).toBe(false)
    expect(calls).toEqual([])
  })

  it('ignores unknown providers and corrupt storage', () => {
    const { data } = browser({ signedIn: false })
    data.set(consent.STORAGE_KEY, JSON.stringify({ youtube: true, bunny: true, vimeo: 'yes' }))
    expect(consent.isRemembered('youtube')).toBe(true)
    expect(consent.isRemembered('vimeo')).toBe(false)
    expect(consent.isRemembered('bunny')).toBe(false)
    data.set(consent.STORAGE_KEY, '{nope')
    expect(consent.isRemembered('youtube')).toBe(false)
  })
})

describe('player consent signed in', () => {
  it("starts from the account's choice and leaves what the browser kept aside", () => {
    const { data } = browser({ signedIn: true, playerConsent: ['vimeo'] })
    data.set(consent.STORAGE_KEY, JSON.stringify({ youtube: true }))
    expect(consent.savedIn()).toBe('account')
    expect(consent.isRemembered('vimeo')).toBe(true)
    expect(consent.isRemembered('youtube')).toBe(false)
  })

  it('saves the whole set to the account, never to the browser', async () => {
    const { calls, data } = browser({ signedIn: true, playerConsent: ['vimeo'] })
    const changed = vi.fn()
    consent.subscribe(changed)
    const saved = consent.setRemembered('youtube', true)
    expect(consent.isRemembered('youtube')).toBe(true)
    expect(changed).toHaveBeenCalledTimes(1)
    expect(await saved).toBe(true)
    await consent.setRemembered('vimeo', false)
    expect(calls).toEqual([
      { path: 'player-consent', method: 'PUT', body: { providers: ['youtube', 'vimeo'] } },
      { path: 'player-consent', method: 'PUT', body: { providers: ['youtube'] } },
    ])
    expect(data.size).toBe(0)
  })

  it('undoes a change the account did not save', async () => {
    browser({
      signedIn: true,
      playerConsent: ['youtube'],
      respond: () => ({ status: 503, body: { error: 'server' } }),
    })
    const saved = consent.setRemembered('youtube', false)
    expect(consent.isRemembered('youtube')).toBe(false)
    expect(await saved).toBe(false)
    expect(consent.isRemembered('youtube')).toBe(true)
  })
})
