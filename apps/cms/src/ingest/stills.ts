import sharp from 'sharp'
import type { Fetch } from './oembed.ts'

/** A thumbnail ready to store: JPEG bytes, always 16:9 without letterbox bars. */
export interface Thumbnail {
  data: Buffer
  mimetype: 'image/jpeg'
  /** The URL it came from. */
  from: string
}

const YOUTUBE_NAMES = ['maxresdefault', 'sddefault', 'hqdefault'] as const
/** `maxresdefault` is already 16:9; the others are 4:3 with black bars. */
const NEEDS_TRIM = new Set<string>(['sddefault', 'hqdefault'])
const MIN_BYTES = 2_000
const WIDE = 16 / 9

/** Where each provider keeps its thumbnails, best first. */
export function thumbnailCandidates(
  provider: string,
  externalId: string,
  vimeoThumbnailUrl?: string | null,
): string[] {
  if (provider === 'youtube')
    return YOUTUBE_NAMES.map((name) => `https://i.ytimg.com/vi/${externalId}/${name}.jpg`)
  if (provider === 'vimeo' && vimeoThumbnailUrl) {
    // Vimeo thumbnails end in their width (`_640`) or size (`_295x166`): ask for a large one first.
    const large = vimeoThumbnailUrl.replace(/_\d+(x\d+)?(\.\w+)?(\?.*)?$/, '_1920$2')
    return large === vimeoThumbnailUrl ? [vimeoThumbnailUrl] : [large, vimeoThumbnailUrl]
  }
  return []
}

/** Removes the letterbox bars; falls back to a centered 16:9 crop when the trim is not plausible. */
async function toWide(input: Buffer, trim: boolean): Promise<Buffer> {
  const image = sharp(input).rotate()
  const meta = await image.metadata()
  const { width = 0, height = 0 } = meta
  if (!width || !height) throw new Error('unreadable image')
  if (!trim) return image.jpeg({ quality: 88 }).toBuffer()
  const trimmed = await sharp(input).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true })
  const ratio = trimmed.info.width / trimmed.info.height
  if (Math.abs(ratio - WIDE) < 0.12) return sharp(trimmed.data).jpeg({ quality: 88 }).toBuffer()
  // Dark frames can fool the trim: crop to 16:9 from the center instead.
  const cropHeight = Math.min(height, Math.round(width / WIDE))
  return sharp(input)
    .extract({ left: 0, top: Math.round((height - cropHeight) / 2), width, height: cropHeight })
    .jpeg({ quality: 88 })
    .toBuffer()
}

/**
 * Downloads the best available thumbnail. A missing YouTube `maxresdefault` answers 404 with a
 * grey placeholder body, so only a 200 with a real image counts. Returns undefined when no
 * candidate works; never throws for provider failures.
 */
export async function downloadThumbnail(
  candidates: string[],
  fetchFn: Fetch,
): Promise<Thumbnail | undefined> {
  for (const url of candidates) {
    try {
      const response = await fetchFn(url)
      if (response.status !== 200) continue
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length < MIN_BYTES) continue
      const name = url.split('/').pop()?.replace(/\..*$/, '') ?? ''
      const data = await toWide(bytes, NEEDS_TRIM.has(name))
      return { data, mimetype: 'image/jpeg', from: url }
    } catch {
      // Try the next candidate.
    }
  }
  return undefined
}
