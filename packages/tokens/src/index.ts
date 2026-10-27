import tokenFile from '../tokens.json' with { type: 'json' }
import {
  buildPalettes,
  buildTypography,
  buildVariables,
  createResolver,
  flattenTokens,
} from './build.ts'
import type { TokenFile } from './types.ts'

export type { FlatToken, ThemeId, Tier, TokenFile, TypeStyle } from './types.ts'
export { cssVarOf } from './build.ts'

/** The token file as written (DTCG). */
export const tokens = tokenFile as unknown as TokenFile

/** Every token, flattened, with its tier and CSS variable: for documentation. */
export const tokenList = flattenTokens(tokens)

/** Resolves a token's value (`{id}` aliases followed) in one mode. */
export const resolveToken = createResolver(tokens).resolve

/** Resolved semantic colours and shadows per mode. `dark` is the product; `light` is email and print only. */
export const palettes = buildPalettes(tokens)

/** Every CSS custom property with its resolved value, per mode: `variables.dark['--spacing-4']`. */
export const variables = buildVariables(tokens)

/** Every type style, resolved, by utility name: `typography['body-l']`. */
export const typography = buildTypography(tokens)
