import sharp from 'sharp'
import type { Fetch } from './oembed.ts'

/** A thumbnail ready to store: JPEG bytes, without black bars on any side. */
export interface Thumbnail {
  data: Buffer
  mimetype: 'image/jpeg'
  /** The URL it came from. */
  from: string
}

const YOUTUBE_NAMES = ['maxresdefault', 'sddefault', 'hqdefault'] as const
const MIN_BYTES = 2_000
/** A row or column is a bar when it is this dark on average and has no brighter pixel than MAX. */
const BAR_MEAN = 20
const BAR_MAX = 48
/** Never keep less than this share of a side: an almost black frame is left as it is. */
const MIN_KEPT = 0.5

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

/** The picture inside any black bars (letterbox, pillarbox or both), as a box in pixels. */
export async function pictureBox(input: Buffer) {
  const { data, info } = await sharp(input)
    .rotate()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info
  if (!width || !height) throw new Error('unreadable image')
  const at = (x: number, y: number) => data[y * width + x] ?? 0
  const isBar = (length: number, pixel: (i: number) => number) => {
    let sum = 0
    for (let i = 0; i < length; i++) {
      const value = pixel(i)
      if (value > BAR_MAX) return false
      sum += value
    }
    return sum / length < BAR_MEAN
  }
  let top = 0
  let bottom = height
  let left = 0
  let right = width
  while (top < bottom && isBar(width, (x) => at(x, top))) top++
  while (bottom > top && isBar(width, (x) => at(x, bottom - 1))) bottom--
  while (left < right && isBar(bottom - top, (y) => at(left, top + y))) left++
  while (right > left && isBar(bottom - top, (y) => at(right - 1, top + y))) right--
  const box = { left, top, width: right - left, height: bottom - top }
  if (box.width < width * MIN_KEPT || box.height < height * MIN_KEPT)
    return { left: 0, top: 0, width, height }
  return box
}

/** Removes black bars on any side and keeps the picture's own aspect ratio. */
async function withoutBars(input: Buffer): Promise<Buffer> {
  const box = await pictureBox(input)
  return sharp(input).rotate().extract(box).jpeg({ quality: 88 }).toBuffer()
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
      const data = await withoutBars(bytes)
      return { data, mimetype: 'image/jpeg', from: url }
    } catch {
      // Try the next candidate.
    }
  }
  return undefined
}
