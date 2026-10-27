import type { CSSProperties, ReactNode } from 'react'
import { cx } from './cx.ts'
import { resolveToken, tokenList, type FlatToken } from './tokens.ts'

/** Building blocks of the foundations pages in Storybook. Not exported from the package. */

/** The tokens whose id starts with `prefix`, in file order. */
export function tokensUnder(prefix: string): FlatToken[] {
  return tokenList.filter((t) => t.id.startsWith(`${prefix}.`))
}

/** A token's name as people say it: its path without the tier, `$root` left out. */
export function tokenName(token: FlatToken): string {
  return token.path
    .slice(1)
    .filter((part) => part !== '$root')
    .join('.')
}

/** The Tailwind utilities a semantic colour reads as. */
export function colorUtilities(token: FlatToken): string {
  const name = token.cssVar.replace(/^--(background-|text-|border-)?color-/, '')
  if (token.cssVar.startsWith('--background-color-')) return `bg-${name}`
  if (token.cssVar.startsWith('--text-color-')) return `text-${name}`
  if (token.cssVar.startsWith('--border-color-')) return `border-${name}`
  return `bg-${name} · text-${name} · border-${name}`
}

export function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="m-0 font-display text-title uppercase">{title}</h2>
        {note ? <p className="m-0 max-w-prose text-small text-secondary">{note}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="grid gap-12 text-primary">{children}</div>
}

/** A token's name, variable and description: the right-hand side of every row. */
export function TokenLabel({ token, extra }: { token: FlatToken; extra?: string }) {
  return (
    <div className="grid gap-hair min-w-0">
      <span className="text-small-strong">{tokenName(token)}</span>
      <code className="font-mono text-label-s text-secondary wrap-anywhere">
        {token.cssVar}
        {extra ? ` · ${extra}` : ''}
      </code>
      {token.description ? (
        <span className="text-meta text-secondary max-w-prose">{token.description}</span>
      ) : null}
    </div>
  )
}

/** A square of colour with its value underneath. */
export function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="grid gap-1 justify-items-start">
      <span
        className="block size-(--control-height-lg) rounded-sm border border-subtle"
        style={{ background: color }}
      />
      <code className="font-mono text-label-s text-secondary">{label}</code>
    </div>
  )
}

/** A two-column row: a specimen, then the token's label. */
export function TokenRow({
  token,
  specimen,
  extra,
  className,
}: {
  token: FlatToken
  specimen: ReactNode
  extra?: string
  className?: string
}) {
  return (
    <div
      className={cx('grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start', className)}
    >
      <div className="min-w-0">{specimen}</div>
      <TokenLabel token={token} extra={extra} />
    </div>
  )
}

/** A type style applied through its variables, so the specimen shows exactly what `text-*` sets. */
export function typeStyle(cssVar: string, family?: string): CSSProperties {
  return {
    fontFamily: family ? `var(--font-${family})` : undefined,
    fontSize: `var(${cssVar})`,
    lineHeight: `var(${cssVar}--line-height)`,
    fontWeight: `var(${cssVar}--font-weight)`,
    letterSpacing: `var(${cssVar}--letter-spacing, normal)`,
  }
}

/** A token's resolved value in a mode, as text. */
export function valueOf(token: FlatToken, mode: 'dark' | 'light' = 'dark'): string {
  const raw = token.modes[mode]
  if (typeof raw === 'object') {
    const size = resolveToken(raw.fontSize, mode)
    const weight = resolveToken(String(raw.fontWeight), mode)
    return `${size} / ${raw.lineHeight} · ${weight}${raw.letterSpacing ? ` · ${raw.letterSpacing}` : ''}`
  }
  return resolveToken(raw, mode, token.id)
}
