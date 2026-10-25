import { messages, type Locale, type Messages } from './messages.ts'

/** A message with plural forms, selected with `Intl.PluralRules` from the `count` parameter. */
type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends PluralForms
      ? `${Prefix}${K}`
      : Leaves<T[K], `${Prefix}${K}.`>
}[keyof T & string]

/** Every translatable key, as a dotted path into the locale file. */
export type MessageKey = Leaves<Messages>

export type MessageParams = Record<string, string | number>

export type Translate = (key: MessageKey, params?: MessageParams) => string

function lookup(tree: unknown, key: string): string | PluralForms {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      tree,
    )
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && typeof (value as PluralForms).other === 'string')
    return value as PluralForms
  throw new Error(`Missing message "${key}"`)
}

function interpolate(template: string, params: MessageParams, locale: Locale): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    if (value === undefined) throw new Error(`Missing parameter "${name}" in "${template}"`)
    return typeof value === 'number' ? new Intl.NumberFormat(locale).format(value) : value
  })
}

export function createTranslator(locale: Locale): Translate {
  const plurals = new Intl.PluralRules(locale)
  return (key, params = {}) => {
    const message = lookup(messages[locale], key)
    if (typeof message === 'string') return interpolate(message, params, locale)
    const count = params.count
    if (typeof count !== 'number') throw new Error(`Message "${key}" needs a numeric "count"`)
    return interpolate(message[plurals.select(count)] ?? message.other, params, locale)
  }
}

/**
 * A message split around the placeholders named in `parts`, so a component can put links or
 * emphasis there without HTML in the locale files: `{legalNotice}` becomes the given node.
 * Other placeholders are filled from `params`, as in `Translate`.
 */
export type RichTranslate = <T>(
  key: MessageKey,
  parts: Record<string, T>,
  params?: MessageParams,
) => (string | T)[]

export function createRichTranslator(locale: Locale): RichTranslate {
  return (key, parts, params = {}) => {
    const message = lookup(messages[locale], key)
    if (typeof message !== 'string') throw new Error(`Message "${key}" has plural forms`)
    return message
      .split(/(\{\w+\})/)
      .filter((piece) => piece !== '')
      .map((piece) => {
        const name = /^\{(\w+)\}$/.exec(piece)?.[1]
        if (name && name in parts) return parts[name] as (typeof parts)[string]
        return interpolate(piece, params, locale)
      })
  }
}
