import { createTranslator, defaultLocale, isLocale, type Locale } from '@fenaki/i18n'

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
  /** The browse page filtered by type (a «genre» in the header). */
  genre: (locale: Locale, type: 'fiction' | 'documentary' | 'animation' | 'experimental') =>
    `/${locale}/cortos?type=${type}`,
  /** The latest shorts, one rail per genre. */
  latest: (locale: Locale) => `/${locale}/novedades`,
  /** The viewer's saved shorts (kept in their browser, so the page is never indexed). */
  myList: (locale: Locale) => `/${locale}/mi-lista`,
  /** Accounts (all outside the sitemap and `noindex`). */
  signUp: (locale: Locale) => `/${locale}/crear-cuenta`,
  signIn: (locale: Locale, next?: string) =>
    `/${locale}/iniciar-sesion${next ? `?next=${encodeURIComponent(next)}` : ''}`,
  verifyAccount: (locale: Locale) => `/${locale}/cuenta/verificar`,
  forgotPassword: (locale: Locale) => `/${locale}/cuenta/recuperar`,
  resetPassword: (locale: Locale) => `/${locale}/cuenta/restablecer`,
  account: (locale: Locale) => `/${locale}/cuenta`,
  history: (locale: Locale) => `/${locale}/historial`,
  showcase: (locale: Locale, slug: string) => `/${locale}/escaparates/${slug}`,
  sponsor: (locale: Locale, section?: 'collection' | 'showcase') =>
    `/${locale}/patrocina${section ? `#${section === 'collection' ? 'coleccion' : 'escaparate'}` : ''}`,
  search: (locale: Locale, query?: string) =>
    `/${locale}/buscar${query ? `?q=${encodeURIComponent(query)}` : ''}`,
  /** A section of the landing page: its waitlist form. */
  landingSection: (locale: Locale, section: 'waitlist') => `/${locale}/#${section}`,
  waitlistConfirm: (locale: Locale) => `/${locale}/lista-de-espera/confirmar`,
  legal: (locale: Locale, page: LegalPage) => `/${locale}/${page}`,
  credits: (locale: Locale) => `/${locale}/creditos`,
  /** Which third-party players load without asking (kept in the browser, never indexed). */
  playerSettings: (locale: Locale) => `/${locale}/preferencias-de-reproduccion`,
  /** The generated Open Graph image of a document or page (see src/pages/og). */
  og: (locale: Locale, kind: 'cortos' | 'personas' | 'colecciones' | 'escaparates', slug: string) =>
    `/og/${locale}/${kind}/${slug}.png`,
  /** ?v changes the address when a card's design changes: the CDN and social networks cache by URL. */
  ogPage: (locale: Locale, page: 'site' | 'browse' | 'sponsor') => `/og/${locale}/${page}.png?v=2`,
}

/** The legal pages, by slug. Their text lives in packages/i18n/legal/<locale>/<slug>.md. */
export const LEGAL_PAGES = [
  'aviso-legal',
  'privacidad',
  'cookies',
  'retirada-de-contenidos',
  'terminos-de-uso',
] as const
export type LegalPage = (typeof LEGAL_PAGES)[number]

export const isLegalPage = (value: unknown): value is LegalPage =>
  typeof value === 'string' && (LEGAL_PAGES as readonly string[]).includes(value)
