import type { APIRoute } from 'astro'
import { iconPng, pngIconResponse } from '../lib/icons.ts'

/** The sizes the web app manifest lists (manifest.webmanifest.ts). */
export const MANIFEST_ICON_SIZES = [192, 512] as const

/** /icon-192.png and /icon-512.png: the home screen icon on Android and desktop installs. */
export const GET: APIRoute = async ({ params }) => {
  const size = MANIFEST_ICON_SIZES.find((s) => String(s) === params.size)
  if (!size) return new Response(null, { status: 404 })
  return pngIconResponse(await iconPng(size))
}
