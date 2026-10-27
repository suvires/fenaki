import { describe, expect, it } from 'vitest'
import {
  buildLightCss,
  buildPalettes,
  buildThemeCss,
  createResolver,
  cssVarOf,
  flattenTokens,
} from '../src/build.ts'
import { palettes, tokens, typography, variables } from '../src/index.ts'
import type { TokenFile } from '../src/types.ts'

const withSemantic = (semantic: TokenFile['semantic']): TokenFile => ({ ...tokens, semantic })

describe('flattenTokens', () => {
  const flat = flattenTokens(tokens)

  it('reads every tier and inherits $type from groups', () => {
    const canvas = flat.find((t) => t.id === 'semantic.color.background.canvas')
    expect(canvas).toMatchObject({ tier: 'semantic', type: 'color' })
    expect(flat.some((t) => t.tier === 'primitive')).toBe(true)
    expect(flat.some((t) => t.tier === 'component')).toBe(true)
  })

  it('gives every token a CSS variable of its own', () => {
    const names = flat.map((t) => t.cssVar)
    expect(new Set(names).size).toBe(names.length)
  })

  it('rejects two tokens that would emit the same variable', () => {
    const clash = withSemantic({
      ...tokens.semantic,
      opacity: { $type: 'number', glow: { $value: '1' } },
      glow: {
        $type: 'number',
        $value: '1',
        $extensions: { 'tv.fenaki': { utility: '--opacity-glow' } },
      },
    })
    expect(() => flattenTokens(clash)).toThrow(/both emit --opacity-glow/)
  })
})

describe('cssVarOf', () => {
  it('names primitives --base-*', () => {
    expect(cssVarOf(['primitive', 'color', 'pink', '500'])).toBe('--base-color-pink-500')
  })

  it('puts surface, text and border colours in their Tailwind namespaces', () => {
    expect(cssVarOf(['semantic', 'color', 'background', 'raised'])).toBe(
      '--background-color-raised',
    )
    expect(cssVarOf(['semantic', 'color', 'text', 'secondary'])).toBe('--text-color-secondary')
    expect(cssVarOf(['semantic', 'color', 'border', 'subtle'])).toBe('--border-color-subtle')
  })

  it('keeps shared colours in --color-*, without $root', () => {
    expect(cssVarOf(['semantic', 'color', 'accent', '$root'])).toBe('--color-accent')
    expect(cssVarOf(['semantic', 'color', 'accent', 'subtle'])).toBe('--color-accent-subtle')
  })

  it('maps type styles to --text-* and component tokens to --{component}-{property}', () => {
    expect(cssVarOf(['semantic', 'typography', 'body-l'])).toBe('--text-body-l')
    expect(cssVarOf(['component', 'chip', 'height'])).toBe('--chip-height')
    expect(cssVarOf(['component', 'control', 'radius'], { utility: '--radius-control' })).toBe(
      '--radius-control',
    )
  })
})

describe('createResolver', () => {
  const { resolve } = createResolver(tokens)

  it('follows aliases through every tier, per mode', () => {
    expect(resolve('{semantic.color.text.accent}', 'dark')).toBe('#ff1f8e')
    expect(resolve('{semantic.color.text.accent}', 'light')).toBe('#c2005f')
    expect(resolve('{semantic.color.text.on-inverse}', 'dark')).toBe('#141414')
  })

  it('rejects unknown and circular aliases', () => {
    const broken = (value: string) =>
      createResolver(
        withSemantic({ ...tokens.semantic, loop: { $type: 'color', a: { $value: value } } }),
      ).resolve('{semantic.loop.a}', 'dark')
    expect(() => broken('{semantic.missing}')).toThrow(/Unknown token "semantic.missing"/)
    expect(() => broken('{semantic.loop.a}')).toThrow(/Circular/)
  })
})

describe('buildThemeCss', () => {
  const css = buildThemeCss(tokens)

  it('clears the Tailwind defaults and declares a static theme', () => {
    expect(css).toContain('@theme static {')
    expect(css).toContain('--*: initial;')
  })

  it('keeps primitives out of the theme, so they make no utilities', () => {
    const theme = css.slice(css.indexOf('@theme static'))
    expect(css).toContain('--base-color-pink-500: #ff1f8e;')
    expect(theme).not.toMatch(/--base-[\w-]+:/)
  })

  it('emits every semantic and component token', () => {
    for (const t of flattenTokens(tokens)) expect(css).toContain(`${t.cssVar}:`)
  })

  it('maps type styles to Tailwind font-size companions', () => {
    expect(css).toContain('--text-label--letter-spacing: 0.06em;')
    expect(css).toContain('--text-display-xl--line-height: 0.92;')
    expect(css).toContain('--text-display-xl--font-weight: var(--base-font-weight-extrabold);')
  })

  it('keeps aliases as variable references', () => {
    expect(css).toContain('--background-color-canvas: var(--base-color-gray-950);')
    expect(css).toContain('--text-color-accent: var(--color-accent);')
  })

  it('is dark only: no light value reaches the product theme', () => {
    const theme = css.slice(css.indexOf('@theme static'))
    expect(theme).not.toContain('var(--base-color-sand-50)')
    expect(theme).not.toContain('#f6f2ec')
    expect(css).not.toContain('data-theme')
  })
})

describe('resolved values', () => {
  it('resolves every variable to a literal', () => {
    expect(variables.dark['--spacing-4']).toBe('16px')
    expect(variables.dark['--text-title--font-weight']).toBe('700')
    expect(Object.values(variables.dark).join()).not.toContain('{')
  })

  it('resolves type styles by utility name', () => {
    expect(typography['button-lg']).toMatchObject({
      fontSize: '17px',
      fontWeight: 700,
      tier: 'component',
    })
    expect(typography.label).toMatchObject({ letterSpacing: '0.06em', family: 'mono' })
  })
})

describe('light mode', () => {
  it('is available as data and as print CSS, outside the theme', () => {
    expect(buildPalettes(tokens).light['background-canvas']).toBe('#f6f2ec')
    expect(palettes.dark['background-canvas']).toBe('#141414')
    const css = buildLightCss(tokens)
    expect(css).toContain('--background-color-canvas: #f6f2ec;')
    expect(css).toContain('--shadow-sm: 0 1px 3px #17130f26;')
    expect(css).toContain('color-scheme: light;')
  })
})
