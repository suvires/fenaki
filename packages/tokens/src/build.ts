import type {
  DesignToken,
  FenakiExtensions,
  FlatToken,
  ThemeId,
  Tier,
  TokenFile,
  TokenGroup,
  TokenValue,
  TypeStyle,
  TypographyValue,
} from './types.ts'

const HEADER = '/* FENAKI: generated from packages/tokens/tokens.json. Do not edit by hand. */'
const ALIAS = /^\{([^{}]+)\}$/
const THEMES: ThemeId[] = ['dark', 'light']
const TIERS: Tier[] = ['primitive', 'semantic', 'component']
/** Colour roles scoped to one kind of utility: `color.background.raised` is `bg-raised`. */
const SCOPED_COLOR_ROLES = ['background', 'text', 'border']
/** Semantic groups whose Tailwind namespace has another name. */
const NAMESPACES: Record<string, string> = { typography: 'text', 'aspect-ratio': 'aspect' }

const isToken = (node: unknown): node is DesignToken =>
  typeof node === 'object' && node !== null && '$value' in node

/**
 * The CSS custom property of a token, by tier:
 * - primitive: `--base-` and its path (`primitive.color.pink.500` is `--base-color-pink-500`);
 * - semantic: its Tailwind theme namespace, so utilities read by role (`color.background.raised` is
 *   `--background-color-raised`, hence `bg-raised`; `color.accent` is `--color-accent`);
 * - component: `--{component}-{property}`, or the theme variable its `utility` names.
 */
export function cssVarOf(path: string[], extensions: FenakiExtensions = {}): string {
  const [tier, ...rest] = path
  const parts = rest.filter((part) => part !== '$root')
  if (extensions.utility) return extensions.utility
  if (tier === 'primitive') return `--base-${parts.join('-')}`
  if (tier === 'component') return `--${parts.join('-')}`
  const [group = '', ...tail] = parts
  if (group === 'color') {
    const [role = '', ...name] = tail
    return SCOPED_COLOR_ROLES.includes(role)
      ? `--${role}-color-${name.join('-')}`
      : `--color-${tail.join('-')}`
  }
  const namespace = NAMESPACES[group] ?? group
  return tail.length > 0 ? `--${namespace}-${tail.join('-')}` : `--${namespace}`
}

/** Every token in the file, in file order, with its type inherited from its groups. */
export function flattenTokens(tokens: TokenFile): FlatToken[] {
  const flat: FlatToken[] = []
  const walk = (node: TokenGroup, path: string[], type: string | undefined) => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') && key !== '$root') continue
      if (typeof child !== 'object' || child === null) continue
      const childPath = [...path, key]
      if (isToken(child)) {
        const extensions = child.$extensions?.['tv.fenaki'] ?? {}
        const tokenType = child.$type ?? type
        if (!tokenType) throw new Error(`Token ${childPath.join('.')} has no $type`)
        flat.push({
          id: childPath.join('.'),
          path: childPath,
          tier: childPath[0] as Tier,
          type: tokenType,
          cssVar: cssVarOf(childPath, extensions),
          description: child.$description,
          modes: { dark: child.$value, light: extensions.modes?.light ?? child.$value },
          extensions,
        })
      } else {
        const group = child as TokenGroup
        walk(group, childPath, group.$type ?? type)
      }
    }
  }
  for (const tier of TIERS) walk(tokens[tier], [tier], tokens[tier].$type)

  const seen = new Map<string, string>()
  for (const token of flat) {
    const other = seen.get(token.cssVar)
    if (other) throw new Error(`${token.id} and ${other} both emit ${token.cssVar}`)
    seen.set(token.cssVar, token.id)
  }
  return flat
}

/** Looks tokens up by id and resolves `{id}` aliases, per mode. */
export function createResolver(tokens: TokenFile) {
  const flat = flattenTokens(tokens)
  const byId = new Map(flat.map((t) => [t.id, t]))
  const target = (value: TokenValue): FlatToken | undefined => {
    const alias = typeof value === 'string' ? ALIAS.exec(value) : null
    if (!alias?.[1]) return undefined
    const found = byId.get(alias[1])
    if (!found) throw new Error(`Unknown token "${alias[1]}"`)
    return found
  }
  const resolveValue = (value: TokenValue, theme: ThemeId, seen: string[]): TokenValue => {
    const next = target(value)
    if (!next) return value
    if (seen.includes(next.id))
      throw new Error(`Circular alias: ${[...seen, next.id].join(' -> ')}`)
    return resolveValue(next.modes[theme], theme, [...seen, next.id])
  }
  /** A scalar resolved to its literal value. */
  const resolve = (value: TokenValue, theme: ThemeId, from = ''): string => {
    const resolved = resolveValue(value, theme, from ? [from] : [])
    if (typeof resolved === 'object') throw new Error(`${from} resolves to a composite value`)
    return String(resolved)
  }
  /** A scalar as CSS: an alias becomes `var(--target)`, a literal stays as it is. */
  const reference = (value: TokenValue): string => {
    const next = target(value)
    return next ? `var(${next.cssVar})` : String(value)
  }
  return { flat, byId, resolve, reference }
}

const TYPE_PARTS: [keyof TypographyValue, string][] = [
  ['fontSize', ''],
  ['lineHeight', '--line-height'],
  ['fontWeight', '--font-weight'],
  ['letterSpacing', '--letter-spacing'],
]

/** A token as CSS declarations: `[name, value]`, a typography token expanded into its parts. */
function declarations(
  token: FlatToken,
  value: (raw: TokenValue) => string,
  theme: ThemeId,
): [string, string][] {
  const raw = token.modes[theme]
  if (token.type === 'typography') {
    const style = raw as TypographyValue
    return TYPE_PARTS.filter(([part]) => style[part] !== undefined).map(([part, suffix]) => [
      `${token.cssVar}${suffix}`,
      value(style[part] as TokenValue),
    ])
  }
  const lines: [string, string][] = [[token.cssVar, value(raw)]]
  if (token.extensions.variation)
    lines.push([`${token.cssVar}--font-variation-settings`, token.extensions.variation])
  if (token.extensions.features)
    lines.push([`${token.cssVar}--font-feature-settings`, token.extensions.features])
  return lines
}

/** Every CSS custom property, per mode, with its value fully resolved: for email, OG images and tests. */
export function buildVariables(tokens: TokenFile): Record<ThemeId, Record<string, string>> {
  const { flat, resolve } = createResolver(tokens)
  const variables = (theme: ThemeId) =>
    Object.fromEntries(
      flat.flatMap((t) => declarations(t, (raw) => resolve(raw, theme, t.id), theme)),
    )
  return { dark: variables('dark'), light: variables('light') }
}

/** The key of a semantic colour or shadow in a palette: `background-canvas`, `accent`, `shadow-sm`. */
function paletteKey(token: FlatToken): string | undefined {
  if (token.tier !== 'semantic') return undefined
  const [, group, ...rest] = token.path.filter((part) => part !== '$root')
  if (group === 'color') return rest.join('-')
  if (group === 'shadow') return `shadow-${rest.join('-')}`
  return undefined
}

/** Every mode's semantic colours and shadows as plain values: for email, print and the native apps. */
export function buildPalettes(tokens: TokenFile): Record<ThemeId, Record<string, string>> {
  const { flat, resolve } = createResolver(tokens)
  const palette = (theme: ThemeId) =>
    Object.fromEntries(
      flat.flatMap((t) => {
        const key = paletteKey(t)
        return key ? [[key, resolve(t.modes[theme], theme, t.id)]] : []
      }),
    )
  return Object.fromEntries(THEMES.map((theme) => [theme, palette(theme)])) as Record<
    ThemeId,
    Record<string, string>
  >
}

/** Every type style (semantic and component), resolved, by utility name (`text-${name}`). */
export function buildTypography(tokens: TokenFile): Record<string, TypeStyle> {
  const { flat, resolve } = createResolver(tokens)
  return Object.fromEntries(
    flat
      .filter((t) => t.type === 'typography')
      .map((t) => {
        const value = t.modes.dark as TypographyValue
        const name = t.cssVar.replace(/^--text-/, '')
        const style: TypeStyle = {
          name,
          tier: t.tier,
          fontSize: resolve(value.fontSize, 'dark', t.id),
          lineHeight: resolve(value.lineHeight, 'dark', t.id),
          fontWeight: Number(resolve(value.fontWeight, 'dark', t.id)),
          ...(value.letterSpacing === undefined
            ? {}
            : { letterSpacing: resolve(value.letterSpacing, 'dark', t.id) }),
          family: t.extensions.family,
          sample: t.extensions.sample,
          usage: t.description,
        }
        return [name, style]
      }),
  )
}

const block = (lines: [string, string][], indent: string) =>
  lines.map(([name, value]) => `${indent}${name}: ${value};`).join('\n')

/**
 * The product theme for Tailwind v4: primitives as plain variables in the theme layer (no
 * utilities, so components cannot reach them), then every semantic and component token as a
 * static theme, with Tailwind's default theme cleared so only FENAKI tokens produce utilities.
 * Dark only.
 */
export function buildThemeCss(tokens: TokenFile): string {
  const { flat, reference } = createResolver(tokens)
  const lines = (tier: Tier) =>
    flat.filter((t) => t.tier === tier).flatMap((t) => declarations(t, reference, 'dark'))

  const primitives = block(lines('primitive'), '    ')
  const theme = block(
    [
      ['--*', 'initial'],
      ...lines('semantic'),
      ...lines('component'),
      ['--default-font-family', 'var(--font-text)'],
      ['--default-mono-font-family', 'var(--font-mono)'],
      ['--default-transition-duration', 'var(--duration-fast)'],
      ['--default-transition-timing-function', 'var(--ease-standard)'],
    ],
    '  ',
  )
  return `${HEADER}

/* Primitives: raw values. Only the tokens below point at them. */
@layer theme {
  :root,
  :host {
${primitives}
  }
}

/* Semantic and component tokens. */
@theme static {
${theme}
}

:root {
  color-scheme: dark;
}
`
}

/** The light mode («Vestíbulo») as plain CSS variables for the newsletter and print documents. */
export function buildLightCss(tokens: TokenFile): string {
  const { flat, resolve } = createResolver(tokens)
  const lines = flat
    .filter((t) => paletteKey(t))
    .map((t): [string, string] => [t.cssVar, resolve(t.modes.light, 'light', t.id)])
  return `${HEADER}
/* Light mode: email, sponsor dossier and print only. Never a product theme. */

:root {
${block(lines, '  ')}
  color-scheme: light;
}
`
}
