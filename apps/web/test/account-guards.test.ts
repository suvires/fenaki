import { describe, expect, it } from 'vitest'
import {
  clientIp,
  createLimiter,
  isSameOrigin,
  LIMITS,
  readJson,
} from '../src/lib/account/guards.ts'
import {
  looksLikeToken,
  loginOutcome,
  signupOutcome,
  tokenOutcome,
} from '../src/lib/account/outcomes.ts'
import {
  checkPassword,
  checkProgress,
  checkRating,
  checkSlug,
  cleanName,
  safeNext,
  signInUrl,
} from '../src/lib/account/rules.ts'

const SITE = 'https://fenaki.tv'
const headers = (init: Record<string, string>) => new Headers(init)

describe('isSameOrigin (CSRF)', () => {
  it('accepts the site and the host the request was sent to', () => {
    expect(isSameOrigin(headers({ origin: 'https://fenaki.tv' }), SITE)).toBe(true)
    expect(
      isSameOrigin(headers({ origin: 'http://localhost:4400', host: 'localhost:4400' }), SITE),
    ).toBe(true)
    expect(
      isSameOrigin(headers({ origin: 'https://fenaki.tv', host: 'internal:4321' }), SITE),
    ).toBe(true)
  })

  it('refuses another site, a malformed origin and «null»', () => {
    expect(isSameOrigin(headers({ origin: 'https://evil.example', host: 'fenaki.tv' }), SITE)).toBe(
      false,
    )
    expect(isSameOrigin(headers({ origin: 'https://fenaki.tv.evil.example' }), SITE)).toBe(false)
    expect(isSameOrigin(headers({ origin: 'null' }), SITE)).toBe(false)
    expect(isSameOrigin(headers({ origin: 'not a url' }), SITE)).toBe(false)
  })

  it('without Origin, trusts only a browser that says the request is same-origin', () => {
    expect(isSameOrigin(headers({ 'sec-fetch-site': 'same-origin' }), SITE)).toBe(true)
    expect(isSameOrigin(headers({ 'sec-fetch-site': 'cross-site' }), SITE)).toBe(false)
    expect(isSameOrigin(headers({}), SITE)).toBe(false)
  })
})

describe('clientIp', () => {
  it('prefers what Cloudflare saw, then the socket', () => {
    expect(clientIp(headers({ 'cf-connecting-ip': '203.0.113.7' }), '10.0.0.2')).toBe('203.0.113.7')
    expect(clientIp(headers({}), '10.0.0.2')).toBe('10.0.0.2')
    expect(clientIp(headers({}), undefined)).toBe('unknown')
  })
})

describe('createLimiter', () => {
  it('limits each kind of action per address, in a window', () => {
    const allow = createLimiter()
    const [limit, window] = LIMITS.login
    for (let i = 0; i < limit; i++) expect(allow('login', '1.1.1.1', 1000)).toBe(true)
    expect(allow('login', '1.1.1.1', 1000)).toBe(false)
    // Another address, another kind of action, and later in time are not affected.
    expect(allow('login', '2.2.2.2', 1000)).toBe(true)
    expect(allow('forgot', '1.1.1.1', 1000)).toBe(true)
    expect(allow('login', '1.1.1.1', 1000 + window)).toBe(true)
  })
})

describe('readJson', () => {
  const post = (body: string, extra: Record<string, string> = {}) =>
    new Request('https://fenaki.tv/api/account/x', { method: 'POST', body, headers: extra })

  it('reads an object, whatever the content type (sendBeacon sends text)', async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 })
    expect(await readJson(post('{"a":1}', { 'content-type': 'application/json' }))).toEqual({
      a: 1,
    })
  })

  it('refuses anything else, and bodies that are too big', async () => {
    for (const body of ['', 'nope', '[1]', '"x"', 'null'])
      expect(await readJson(post(body))).toBeUndefined()
    expect(await readJson(post(JSON.stringify({ a: 'x'.repeat(70_000) })))).toBeUndefined()
  })
})

describe('generic answers', () => {
  it('sign-up looks the same for a new and an existing address', () => {
    const taken = { errors: [{ name: 'ValidationError', data: { errors: [{ path: 'email' }] } }] }
    expect(signupOutcome(201, {})).toBe('created')
    expect(signupOutcome(400, taken)).toBe('existing')
    expect(signupOutcome(400, { errors: [{ data: { errors: [{ path: 'password' }] } }] })).toBe(
      'server',
    )
    expect(signupOutcome(500, undefined)).toBe('server')
  })

  it('sign-in tells a wrong password, an unknown email and a locked account apart from nothing', () => {
    expect(loginOutcome(200)).toBe('ok')
    expect(loginOutcome(401)).toBe('invalid')
    expect(loginOutcome(403)).toBe('unverified')
    expect(loginOutcome(502)).toBe('server')
  })

  it('tokens: client errors are an invalid link, not a server problem', () => {
    expect(tokenOutcome(200)).toBe('ok')
    expect(tokenOutcome(403)).toBe('invalid_token')
    expect(tokenOutcome(500)).toBe('server')
    expect(looksLikeToken('a1b2c3d4e5f6a7b8c9d0')).toBe(true)
    expect(looksLikeToken('../../etc/passwd')).toBe(false)
    expect(looksLikeToken('short')).toBe(false)
    expect(looksLikeToken(undefined)).toBe(false)
  })
})

describe('rules', () => {
  it('asks for at least 10 characters', () => {
    expect(checkPassword('123456789')).toEqual({ ok: false, error: 'short' })
    expect(checkPassword('1234567890')).toEqual({ ok: true, password: '1234567890' })
    expect(checkPassword('')).toEqual({ ok: false, error: 'empty' })
    expect(checkPassword('x'.repeat(201))).toEqual({ ok: false, error: 'long' })
    expect(checkPassword(undefined)).toEqual({ ok: false, error: 'empty' })
  })

  it('redirects after sign-in only to paths of this site', () => {
    expect(safeNext('/es/mi-lista')).toBe('/es/mi-lista')
    expect(safeNext('/es/cortos?type=animation#x')).toBe('/es/cortos?type=animation#x')
    for (const bad of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      'javascript:alert(1)',
      'es/cuenta',
      '/api/account/delete',
      '/es/\nx',
      '',
      undefined,
      42,
    ])
      expect(safeNext(bad)).toBeUndefined()
    expect(signInUrl('/es/iniciar-sesion', '/es/historial')).toBe(
      '/es/iniciar-sesion?next=%2Fes%2Fhistorial',
    )
    expect(signInUrl('/es/iniciar-sesion', '//evil.example')).toBe('/es/iniciar-sesion')
  })

  it('cleans names, slugs, ratings and progress', () => {
    expect(cleanName('  Ana   María ')).toBe('Ana María')
    expect(cleanName('   ')).toBeUndefined()
    expect(cleanName('x'.repeat(100))).toHaveLength(80)
    expect(checkSlug('la-dama-y-la-muerte')).toBe('la-dama-y-la-muerte')
    expect(checkSlug('../x')).toBeUndefined()
    expect(checkSlug('UPPER')).toBeUndefined()
    expect(checkRating('love')).toBe('love')
    expect(checkRating('meh')).toBeUndefined()
    expect(checkProgress(30, 600)).toEqual({ position: 30, duration: 600 })
    expect(checkProgress(700, 600)).toEqual({ position: 600, duration: 600 })
    for (const [position, duration] of [
      [-1, 600],
      [10, 0],
      [10, 1e9],
      [NaN, 600],
      ['5', 600],
    ])
      expect(checkProgress(position, duration)).toBeUndefined()
  })
})
