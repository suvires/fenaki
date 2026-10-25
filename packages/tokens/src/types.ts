export type ThemeId = 'dark' | 'light'

export interface Token<V = string> {
  name: string
  value: V
  usage?: string
}

export interface TypeStyle {
  name: string
  fontSize: string
  lineHeight: string
  fontWeight: number
  letterSpacing?: string
  sample?: string
  usage?: string
}

export interface TokenGroup<V = string> {
  note?: string
  tokens: Token<V>[]
}

export interface TokenFile {
  name: string
  version: number
  color: {
    themes: { id: ThemeId; name: string }[]
    tokens: Token<Record<ThemeId, string>>[]
  }
  type: {
    families: Record<'display' | 'text' | 'mono', string>
    groups: { name: string; family: string; note?: string; styles: TypeStyle[] }[]
  }
  spacing: TokenGroup
  radius: TokenGroup
  shadow: TokenGroup<Record<ThemeId, string>>
  ratio: TokenGroup
  size: TokenGroup
  container: TokenGroup
  breakpoint: TokenGroup
  motion: TokenGroup
  opacity: TokenGroup
}
