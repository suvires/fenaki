import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { applyTextColor } from '../src/collections/Stills.ts'
import { measureTextColor } from '../src/ingest/stills.ts'

const W = 640
const H = 360

/** A 16:9 frame of one grey level, with an optional block of another in the lower left. */
function frame(grey: number, lowerLeft?: number) {
  const pixels = Buffer.alloc(W * H * 3, grey)
  if (lowerLeft !== undefined) {
    for (let y = Math.round(H * 0.6); y < H; y++)
      pixels.fill(lowerLeft, y * W * 3, (y * W + Math.round(W * 0.6)) * 3)
  }
  return sharp(pixels, { raw: { width: W, height: H, channels: 3 } })
    .jpeg()
    .toBuffer()
}

describe('measureTextColor', () => {
  it('asks for light text over a dark image', async () => {
    expect((await measureTextColor(await frame(20))).color).toBe('light')
  })

  it('asks for dark text over a light image', async () => {
    expect((await measureTextColor(await frame(235))).color).toBe('dark')
  })

  it('only looks at the lower left, where the text sits', async () => {
    // A bright sky with a dark lower left reads as dark, and the other way round.
    expect((await measureTextColor(await frame(245, 16))).color).toBe('light')
    expect((await measureTextColor(await frame(16, 245))).color).toBe('dark')
  })

  it('follows the EXIF orientation', async () => {
    const rotated = await sharp(await frame(245, 16))
      .withMetadata({ orientation: 1 })
      .jpeg()
      .toBuffer()
    expect((await measureTextColor(rotated)).color).toBe('light')
  })
})

describe('applyTextColor', () => {
  it('measures a new file and uses it', async () => {
    const data = await applyTextColor({
      data: { textColor: 'light' },
      file: { data: await frame(235) },
    })
    expect(data).toMatchObject({ textColor: 'dark', textColorAuto: 'dark', textColorSet: 'auto' })
  })

  it('follows the measurement on a refresh while nobody has chosen', async () => {
    const data = await applyTextColor({
      data: {},
      originalDoc: { textColor: 'light', textColorSet: 'auto' },
      file: { data: await frame(235) },
    })
    expect(data).toMatchObject({ textColor: 'dark', textColorSet: 'auto' })
  })

  it('marks an editor change as manual', async () => {
    const data = await applyTextColor({
      data: { textColor: 'dark' },
      originalDoc: { textColor: 'light', textColorSet: 'auto' },
    })
    expect(data).toMatchObject({ textColor: 'dark', textColorSet: 'manual' })
  })

  it("keeps the editor's choice when the nightly refresh brings a new file", async () => {
    const data = await applyTextColor({
      data: {},
      originalDoc: { textColor: 'dark', textColorAuto: 'light', textColorSet: 'manual' },
      file: { data: await frame(20) },
    })
    expect(data.textColor).toBeUndefined()
    expect(data).toMatchObject({ textColorAuto: 'light', textColorSet: 'manual' })
  })

  it("does not take a script's value for an editor's choice", async () => {
    const data = await applyTextColor({
      data: { textColor: 'dark', textColorAuto: 'dark' },
      originalDoc: { textColor: 'light', textColorSet: 'auto' },
      fromScript: true,
    })
    expect(data.textColorSet).toBe('auto')
  })
})
