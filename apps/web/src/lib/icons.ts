import favicon from '@fenaki/ui/favicon.svg?raw'
import sharp from 'sharp'

/**
 * The site icon: the avatar's pink F on the darkest surface, from the design system. Browsers that
 * read SVG icons get it as is; the rest, and the iPhone home screen, get a PNG rendered from it.
 */
export const FAVICON_SVG: string = favicon

/** The icon as a square PNG of the given size in pixels. */
export function iconPng(size: number): Promise<Buffer> {
  return sharp(Buffer.from(FAVICON_SVG)).resize(size, size).png({ compressionLevel: 9 }).toBuffer()
}

const CACHE = 'public, max-age=86400'

export function svgIconResponse(): Response {
  return new Response(FAVICON_SVG, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': CACHE },
  })
}

export function pngIconResponse(png: Buffer): Response {
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE },
  })
}
