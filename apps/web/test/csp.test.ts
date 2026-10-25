import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import {
  PLAYER_ORIGINS,
  runtimePolicy,
  STATIC_DIRECTIVES,
  STYLE_ATTRIBUTES,
} from '../src/lib/csp.ts'

describe('content security policy', () => {
  it('frames only the official players, and nobody frames the site', () => {
    expect(STATIC_DIRECTIVES).toContain(
      'frame-src https://www.youtube-nocookie.com https://player.vimeo.com',
    )
    expect(STATIC_DIRECTIVES).toContain("frame-ancestors 'none'")
    expect(PLAYER_ORIGINS).toHaveLength(2)
  })

  it('loads scripts from the site itself, and Umami from its own origin', () => {
    const policy = runtimePolicy({
      umamiScriptUrl: 'https://stats.fenaki.tv/script.js',
      cmsPublicUrl: 'https://cms.fenaki.tv',
    })
    expect(policy.scriptResources).toEqual(['https://stats.fenaki.tv'])
    expect(policy.directives).toEqual([
      "img-src 'self' data: https://cms.fenaki.tv",
      "connect-src 'self' https://stats.fenaki.tv",
    ])
  })

  it('allows nothing else when analytics are off', () => {
    expect(runtimePolicy({ umamiScriptUrl: '', cmsPublicUrl: 'http://localhost:3000' })).toEqual({
      scriptResources: [],
      directives: ["img-src 'self' data: http://localhost:3000", "connect-src 'self'"],
    })
  })

  it('never allows inline or evaluated code', () => {
    const policy = runtimePolicy({ umamiScriptUrl: 'https://stats.fenaki.tv/script.js' })
    const everything = [...STATIC_DIRECTIVES, ...policy.directives, ...policy.scriptResources]
    expect(everything.join(' ')).not.toMatch(/unsafe-inline|unsafe-eval|\*/)
  })

  it('allows each inline style attribute by the hash of its exact value', () => {
    for (const [style, hash] of Object.entries(STYLE_ATTRIBUTES))
      expect(hash).toBe(`sha256-${createHash('sha256').update(style).digest('base64')}`)
  })
})
