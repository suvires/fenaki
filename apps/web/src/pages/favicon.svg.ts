import type { APIRoute } from 'astro'
import { svgIconResponse } from '../lib/icons.ts'

export const GET: APIRoute = () => svgIconResponse()
