import type { ThemeId, TokenFile } from './types.ts'

const HEADER = '/* Fenaki: generated from packages/tokens/tokens.json. Do not edit by hand. */'
const ALIAS = /^\{([a-z0-9-]+)\}$/

/** Resolves one theme's colors, following `{name}` aliases to other color tokens. */
export function resolveColors(tokens: TokenFile, theme: ThemeId): Record<string, string> {
  const raw = new Map(tokens.color.tokens.map((t) => [t.name, t.value[theme]]))
  const resolve = (name: string, seen: string[]): string => {
    const value = raw.get(name)
    if (value === undefined) throw new Error(`Unknown color token "${name}"`)
    const alias = ALIAS.exec(value)
    if (!alias?.[1]) return value
    if (seen.includes(alias[1]))
      throw new Error(`Circular color alias: ${[...seen, alias[1]].join(' -> ')}`)
    return resolve(alias[1], [...seen, alias[1]])
  }
  return Object.fromEntries([...raw.keys()].map((name) => [name, resolve(name, [name])]))
}

/** Every theme's colors and shadows as plain values: for email, print and the native apps. */
export function buildPalettes(tokens: TokenFile): Record<ThemeId, Record<string, string>> {
  const palette = (theme: ThemeId) => ({
    ...resolveColors(tokens, theme),
    ...Object.fromEntries(tokens.shadow.tokens.map((t) => [t.name, t.value[theme]])),
  })
  return { dark: palette('dark'), light: palette('light') }
}

function colorValue(tokens: TokenFile, name: string, theme: ThemeId): string {
  const value = tokens.color.tokens.find((t) => t.name === name)?.value[theme]
  const alias = value ? ALIAS.exec(value) : null
  return alias?.[1] ? `var(--color-${alias[1]})` : (value ?? '')
}

/**
 * The product theme for Tailwind v4: the dark palette and every scale, with Tailwind's
 * default theme cleared so only Fenaki tokens produce utilities.
 */
export function buildThemeCss(tokens: TokenFile): string {
  const lines: string[] = []
  const add = (name: string, value: string | number) => lines.push(`  --${name}: ${value};`)

  lines.push('  --*: initial;')
  for (const t of tokens.color.tokens) add(`color-${t.name}`, colorValue(tokens, t.name, 'dark'))
  for (const [family, stack] of Object.entries(tokens.type.families)) add(`font-${family}`, stack)
  for (const [family, settings] of Object.entries(tokens.type.familySettings ?? {})) {
    if (settings.variation) add(`font-${family}--font-variation-settings`, settings.variation)
    if (settings.features) add(`font-${family}--font-feature-settings`, settings.features)
  }
  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      add(`text-${s.name}`, s.fontSize)
      add(`text-${s.name}--line-height`, s.lineHeight)
      add(`text-${s.name}--font-weight`, s.fontWeight)
      if (s.letterSpacing) add(`text-${s.name}--letter-spacing`, s.letterSpacing)
    }
  }
  for (const t of tokens.spacing.tokens) add(`spacing-${t.name.replace(/^space-/, '')}`, t.value)
  for (const t of tokens.radius.tokens) add(t.name, t.value)
  for (const t of tokens.shadow.tokens)
    add(`shadow-${t.name.replace(/^shadow-/, '')}`, t.value.dark)
  for (const t of tokens.ratio.tokens) add(`aspect-${t.name.replace(/^ratio-/, '')}`, t.value)
  for (const t of tokens.size.tokens) add(`size-${t.name}`, t.value)
  for (const t of tokens.container.tokens) add(`container-${t.name}`, t.value)
  for (const t of tokens.breakpoint.tokens) add(`breakpoint-${t.name}`, t.value)
  for (const t of tokens.motion.tokens) add(t.name, t.value)
  for (const t of tokens.opacity.tokens) add(`opacity-${t.name}`, t.value)
  for (const t of tokens.blur.tokens) add(`blur-${t.name}`, t.value)
  if (tokens.type.wordSpacing) add('word-spacing', tokens.type.wordSpacing)
  add('default-font-family', 'var(--font-text)')
  add('default-mono-font-family', 'var(--font-mono)')
  add('default-transition-duration', 'var(--duration-press)')
  add('default-transition-timing-function', 'var(--ease-standard)')

  return `${HEADER}\n\n@theme static {\n${lines.join('\n')}\n}\n\n:root {\n  color-scheme: dark;\n}\n`
}

/** The light palette («Vestíbulo») as plain CSS variables for the newsletter and print documents. */
export function buildLightCss(tokens: TokenFile): string {
  const palette = buildPalettes(tokens).light
  const lines = Object.entries(palette).map(([name, value]) => {
    const isShadow = tokens.shadow.tokens.some((t) => t.name === name)
    return `  --${isShadow ? name : `color-${name}`}: ${value};`
  })
  return `${HEADER}\n/* Light palette: email, sponsor dossier and print only. Never a product theme. */\n\n:root {\n${lines.join('\n')}\n  color-scheme: light;\n}\n`
}
