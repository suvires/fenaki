export type ThemeId = 'dark' | 'light'

export type Tier = 'primitive' | 'semantic' | 'component'

/** FENAKI's own keys, under `$extensions["tv.fenaki"]`. */
export interface FenakiExtensions {
  /** The light mode's value; `$value` is the dark one (the product). */
  modes?: Partial<Record<ThemeId, TokenValue>>
  /** For component tokens: the Tailwind theme variable they are exposed as, e.g. `--radius-control`. */
  utility?: string
  /** For type styles: the family they are drawn in (the style itself never sets it). */
  family?: 'display' | 'text' | 'mono'
  sample?: string
  /** For font families: variable-axis settings and OpenType features. */
  variation?: string
  features?: string
}

export interface TypographyValue {
  fontSize: string
  lineHeight: string
  fontWeight: string | number
  letterSpacing?: string
}

export type TokenValue = string | number | TypographyValue

/** A DTCG token: any object with a `$value`. */
export interface DesignToken {
  $value: TokenValue
  $type?: string
  $description?: string
  $extensions?: { 'tv.fenaki'?: FenakiExtensions }
}

/** A DTCG group: tokens and groups by name, plus `$type` (inherited) and `$description`. */
export interface TokenGroup {
  $type?: string
  $description?: string
  $extensions?: Record<string, unknown>
  [name: string]: TokenGroup | DesignToken | string | Record<string, unknown> | undefined
}

export interface TokenFile extends TokenGroup {
  primitive: TokenGroup
  semantic: TokenGroup
  component: TokenGroup
}

/** One token, flattened, with its CSS variable. */
export interface FlatToken {
  /** Dotted path, the form aliases use: `semantic.color.background.canvas`. */
  id: string
  path: string[]
  tier: Tier
  type: string
  /** The CSS custom property it is emitted as: `--background-color-canvas`. */
  cssVar: string
  description?: string
  /** Raw value per mode (aliases unresolved). Modes without their own value repeat `dark`. */
  modes: Record<ThemeId, TokenValue>
  extensions: FenakiExtensions
}

/** A type style with every value resolved. */
export interface TypeStyle {
  /** The utility name: `text-${name}`. */
  name: string
  tier: Tier
  fontSize: string
  lineHeight: string
  fontWeight: number
  letterSpacing?: string
  family?: 'display' | 'text' | 'mono'
  sample?: string
  usage?: string
}
