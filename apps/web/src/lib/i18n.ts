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
  person: (locale: Locale, slug: string) => `/${locale}/personas/${slug}`,
  browse: (locale: Locale) => `/${locale}/cortos`,
  showcase: (locale: Locale, slug: string) => `/${locale}/escaparates/${slug}`,
  sponsor: (locale: Locale, section?: 'collection' | 'showcase') =>
    `/${locale}/patrocina${section ? `#${section === 'collection' ? 'coleccion' : 'escaparate'}` : ''}`,
  search: (locale: Locale, query?: string) =>
    `/${locale}/buscar${query ? `?q=${encodeURIComponent(query)}` : ''}`,
  /** A section of the landing page: `what`, `legal`, `faq` or `waitlist`. */
  landingSection: (locale: Locale, section: 'what' | 'legal' | 'faq' | 'waitlist') =>
    `/${locale}/#${section}`,
  waitlistConfirm: (locale: Locale) => `/${locale}/lista-de-espera/confirmar`,
  legal: (locale: Locale, page: LegalPage) => `/${locale}/${page}`,
  /** The generated Open Graph image of a document or page (see src/pages/og). */
  og: (locale: Locale, kind: 'cortos' | 'personas' | 'colecciones' | 'escaparates', slug: string) =>
    `/og/${locale}/${kind}/${slug}.png`,
  ogPage: (locale: Locale, page: 'site' | 'browse' | 'sponsor') => `/og/${locale}/${page}.png`,
}

/** The legal pages, by slug. Their text lives in packages/i18n/legal/<locale>/<slug>.md. */
export const LEGAL_PAGES = [
  'aviso-legal',
  'privacidad',
  'cookies',
  'retirada-de-contenidos',
] as const
export type LegalPage = (typeof LEGAL_PAGES)[number]

export const isLegalPage = (value: unknown): value is LegalPage =>
  typeof value === 'string' && (LEGAL_PAGES as readonly string[]).includes(value)
