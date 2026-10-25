import type { APIRoute } from 'astro'
import { iconPng, pngIconResponse } from '../lib/icons.ts'

/** Browsers and crawlers ask for /favicon.ico on their own: a 32 px PNG (they read it fine). */
export const GET: APIRoute = async () => pngIconResponse(await iconPng(32))
