import { describe, expect, it } from 'vitest'
import { buildLightCss, buildPalettes, buildThemeCss, resolveColors } from '../src/build.ts'
import { tokens } from '../src/index.ts'
import type { TokenFile } from '../src/types.ts'

describe('resolveColors', () => {
  it('follows aliases to their target value', () => {
    const dark = resolveColors(tokens, 'dark')
    expect(dark['tungsteno-text']).toBe(dark.tungsteno)
    expect(dark['sala-0']).toBe('#141414')
  })

  it('rejects unknown and circular aliases', () => {
    const broken = (value: string): TokenFile => ({
      ...tokens,
      color: { ...tokens.color, tokens: [{ name: 'a', value: { dark: value, light: value } }] },
    })
    expect(() => resolveColors(broken('{missing}'), 'dark')).toThrow(
      /Unknown color token "missing"/,
    )
    expect(() => resolveColors(broken('{a}'), 'dark')).toThrow(/Circular/)
  })
})

describe('buildThemeCss', () => {
  const css = buildThemeCss(tokens)

  it('clears the Tailwind defaults and declares a static theme', () => {
    expect(css).toContain('@theme static {')
    expect(css).toContain('--*: initial;')
  })

  it('emits every token from tokens.json', () => {
    for (const t of tokens.color.tokens) expect(css).toContain(`--color-${t.name}:`)
    for (const t of tokens.spacing.tokens) expect(css).toContain(`--spacing-${t.name.slice(6)}:`)
    for (const t of tokens.radius.tokens) expect(css).toContain(`--${t.name}: ${t.value};`)
    for (const t of tokens.size.tokens) expect(css).toContain(`--size-${t.name}: ${t.value};`)
    for (const g of tokens.type.groups)
      for (const s of g.styles) expect(css).toContain(`--text-${s.name}: ${s.fontSize};`)
  })

  it('maps type styles to Tailwind font-size companions', () => {
    expect(css).toContain('--text-label--letter-spacing: 0.06em;')
    expect(css).toContain('--text-display-xl--line-height: 0.92;')
    expect(css).toContain('--text-display-xl--font-weight: 800;')
  })

  it('keeps aliases as variable references', () => {
    expect(css).toContain('--color-tungsteno-text: var(--color-tungsteno);')
  })

  it('is dark only: no light value reaches the product theme', () => {
    expect(css).toContain('--color-sala-0: #141414;')
    expect(css).not.toContain('#f6f2ec')
    expect(css).not.toContain('data-theme')
  })
})

describe('light palette', () => {
  it('is available as data and as print CSS, outside the theme', () => {
    expect(buildPalettes(tokens).light['sala-0']).toBe('#f6f2ec')
    const css = buildLightCss(tokens)
    expect(css).toContain('--color-sala-0: #f6f2ec;')
    expect(css).toContain('--shadow-card: 0 1px 3px #17130f26;')
    expect(css).toContain('color-scheme: light;')
  })
})
