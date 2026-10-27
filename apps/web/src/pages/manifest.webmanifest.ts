import { defaultLocale } from '@fenaki/i18n'
import { palettes } from '@fenaki/tokens'
import type { APIRoute } from 'astro'
import { paths, translator } from '../lib/i18n.ts'
import { MANIFEST_ICON_SIZES } from './icon-[size].png.ts'

/**
 * The web app manifest: FENAKI can be added to the home screen and opens without the browser's
 * bars. No service worker and no offline mode during the challenge (CLAUDE.md, «Later»).
 */
export const GET: APIRoute = () => {
  const t = translator(defaultLocale)
  const ground = palettes.dark['background-canvas']
  const manifest = {
    name: t('site.name'),
    short_name: t('site.name'),
    description: t('site.description'),
    lang: defaultLocale,
    start_url: paths.home(defaultLocale),
    scope: '/',
    display: 'standalone',
    background_color: ground,
    theme_color: ground,
    icons: [
      ...MANIFEST_ICON_SIZES.map((size) => ({
        src: `/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'any',
      })),
      // The F sits well inside the square, so the same image survives the round and squircle masks.
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
