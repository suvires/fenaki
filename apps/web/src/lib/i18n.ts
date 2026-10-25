import { createTranslator, defaultLocale, isLocale, type Locale } from '@shortix/i18n'

/** The locale of a request, from its `[locale]` route segment. Undefined when it is not one we serve. */
export function localeFrom(param: string | undefined): Locale | undefined {
  return isLocale(param) ? param : undefined
}

export function translator(locale: Locale = defaultLocale) {
  return createTranslator(locale)
}

/** Paths are locale-prefixed even while `es` is the only locale. */
export const paths = {
  home: (locale: Locale) => `/${locale}/`,
  short: (locale: Locale, slug: string) => `/${locale}/cortos/${slug}`,
  collection: (locale: Locale, slug: string) => `/${locale}/colecciones/${slug}`,
  search: (locale: Locale, query?: string) =>
    `/${locale}/buscar${query ? `?q=${encodeURIComponent(query)}` : ''}`,
}
