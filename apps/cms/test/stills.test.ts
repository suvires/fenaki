import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { pictureBox } from '../src/ingest/stills.ts'

/** A black frame with a picture of the given size placed at (left, top). */
async function framed(
  frame: { width: number; height: number },
  picture: { width: number; height: number; left: number; top: number; color?: string },
) {
  const inner = await sharp({
    create: {
      width: picture.width,
      height: picture.height,
      channels: 3,
      background: picture.color ?? '#a07040',
    },
  })
    .png()
    .toBuffer()
  return sharp({ create: { ...frame, channels: 3, background: '#000' } })
    .composite([{ input: inner, left: picture.left, top: picture.top }])
    .jpeg()
    .toBuffer()
}

describe('pictureBox', () => {
  it('removes letterbox bars (top and bottom)', async () => {
    const image = await framed(
      { width: 640, height: 480 },
      { width: 640, height: 304, left: 0, top: 88 },
    )
    expect(await pictureBox(image)).toEqual({ left: 0, top: 88, width: 640, height: 304 })
  })

  it('removes pillarbox bars (left and right)', async () => {
    const image = await framed(
      { width: 1280, height: 720 },
      { width: 960, height: 720, left: 160, top: 0 },
    )
    expect(await pictureBox(image)).toEqual({ left: 160, top: 0, width: 960, height: 720 })
  })

  it('removes bars on all four sides and keeps the picture’s own ratio', async () => {
    const image = await framed(
      { width: 640, height: 480 },
      { width: 480, height: 270, left: 80, top: 105 },
    )
    expect(await pictureBox(image)).toEqual({ left: 80, top: 105, width: 480, height: 270 })
  })

  it('leaves a picture without bars untouched', async () => {
    const image = await sharp({
      create: { width: 1280, height: 720, channels: 3, background: '#a07040' },
    })
      .jpeg()
      .toBuffer()
    expect(await pictureBox(image)).toEqual({ left: 0, top: 0, width: 1280, height: 720 })
  })

  it('keeps a dark scene that has detail at its edges', async () => {
    // Dark grey with a brighter band across every edge row and column.
    const image = await framed(
      { width: 640, height: 360 },
      { width: 640, height: 360, left: 0, top: 0, color: '#2a2a2a' },
    )
    expect(await pictureBox(image)).toEqual({ left: 0, top: 0, width: 640, height: 360 })
  })

  it('leaves an almost black frame as it is', async () => {
    const image = await framed(
      { width: 640, height: 360 },
      { width: 40, height: 40, left: 300, top: 160 },
    )
    expect(await pictureBox(image)).toEqual({ left: 0, top: 0, width: 640, height: 360 })
  })
})
