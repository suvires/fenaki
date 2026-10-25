import type { APIRoute } from 'astro'

/** Health check for kamal-proxy during deploys: the server is up and rendering. */
export const GET: APIRoute = () =>
  new Response('ok', { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } })
