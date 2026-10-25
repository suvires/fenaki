import type { Locale } from './messages.ts'

/** Running time in whole minutes («15 min»), never less than one. */
export function formatDuration(seconds: number, locale: Locale): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'minute',
    unitDisplay: 'short',
  }).format(minutes)
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

/** A calendar year, without digit grouping. */
export function formatYear(year: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { useGrouping: false }).format(year)
}

export function formatDate(
  date: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(new Date(date))
}

/** A country name from its ISO 3166-1 alpha-2 code («ES» → «España»). */
export function formatCountry(code: string, locale: Locale): string {
  return new Intl.DisplayNames(locale, { type: 'region' }).of(code.toUpperCase()) ?? code
}

/** A language name from its BCP 47 code («es» → «español»). */
export function formatLanguage(code: string, locale: Locale): string {
  return new Intl.DisplayNames(locale, { type: 'language' }).of(code) ?? code
}

/** A list of names joined the way the locale does it («A, B y C»). */
export function formatList(items: string[], locale: Locale): string {
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items)
}

/**
 * A list split into its items and the words between them, so each item can become a link:
 * «A, B y C» → A · «, » · B · « y » · C.
 */
export function formatListParts(
  items: string[],
  locale: Locale,
): { type: 'element' | 'literal'; value: string }[] {
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).formatToParts(items)
}

/** The name of a weekday, ISO numbered (1 = Monday … 7 = Sunday): «jueves». */
export function formatWeekday(isoDay: number, locale: Locale): string {
  // 2024-01-01 was a Monday.
  const date = new Date(Date.UTC(2024, 0, isoDay))
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(date)
}
