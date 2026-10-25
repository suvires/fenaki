import type { APIRoute } from 'astro'
import { robotsTxt } from '../lib/seo.ts'
import { siteUrl } from '../lib/services.ts'

export const GET: APIRoute = () =>
  new Response(robotsTxt(siteUrl), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
