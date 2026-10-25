import type { APIRoute } from 'astro'
import { iconPng, pngIconResponse } from '../lib/icons.ts'

/** The iPhone and iPad home screen icon. */
export const GET: APIRoute = async () => pngIconResponse(await iconPng(180))
