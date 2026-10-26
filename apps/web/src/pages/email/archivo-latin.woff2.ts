import type { APIRoute } from 'astro'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/**
 * Archivo (Latin, variable) for FENAKI's emails, at an address that never changes: emails stay in
 * inboxes for years, so they cannot point at the site's hashed asset. Fonts are fetched with CORS,
 * so any origin may load it (an email client's, or none). Clients that ignore web fonts (Gmail,
 * Outlook on Windows) use the fallback in the email's font stack.
 */
const file = fileURLToPath(
  import.meta.resolve('@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2'),
)

export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await readFile(file)), {
    headers: {
      'Content-Type': 'font/woff2',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  })
