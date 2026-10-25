import es from '../locales/es.json' with { type: 'json' }

export const locales = ['es'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'es'

/** The shape every locale file must match; `es` is the reference. */
export type Messages = typeof es

export const messages: Record<Locale, Messages> = { es }

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}
