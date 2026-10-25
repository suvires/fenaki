import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { FAVICON_SVG, iconPng } from '../src/lib/icons.ts'

describe('site icon', () => {
  it('is the pink F on the darkest surface', () => {
    expect(FAVICON_SVG).toContain('fill="#ff1f8e"')
    expect(FAVICON_SVG).toContain('fill="#0a0908"')
  })

  it('renders square PNGs at the requested size', async () => {
    for (const size of [32, 180]) {
      const meta = await sharp(await iconPng(size)).metadata()
      expect([meta.format, meta.width, meta.height]).toEqual(['png', size, size])
    }
  })
})
