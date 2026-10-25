import tokenFile from '../tokens.json' with { type: 'json' }
import { buildPalettes } from './build.ts'
import type { TokenFile } from './types.ts'

export type { ThemeId, Token, TokenFile, TypeStyle } from './types.ts'

export const tokens = tokenFile as TokenFile

/** Resolved color and shadow values per palette. `dark` is the product; `light` is email and print only. */
export const palettes = buildPalettes(tokens)
