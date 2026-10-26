import { palettes } from '@fenaki/tokens'
import wordmark from '@fenaki/ui/wordmark.svg?raw'
import type { APIRoute } from 'astro'
import sharp from 'sharp'
import { pngIconResponse } from '../../lib/icons.ts'

/**
 * The FENAKI logotype for emails, in the light palette's ink: a PNG, because email clients such as
 * Gmail do not show SVG. Rendered at three times the size the emails show it (28px tall).
 */
export const GET: APIRoute = async () => {
  const svg = wordmark.replace('fill="currentColor"', `fill="${palettes.light.ink}"`)
  const png = await sharp(Buffer.from(svg), { density: 300 })
    .resize({ height: 84 })
    .png({ compressionLevel: 9 })
    .toBuffer()
  return pngIconResponse(png)
}
