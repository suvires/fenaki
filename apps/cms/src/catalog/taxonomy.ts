import { label, type AdminLabel } from '../labels.ts'

/**
 * How a short is classified beyond its type (fiction, documentary, animation, experimental):
 * genres (up to two), themes (up to two) and whether it suits every audience. The values are the
 * catalog's filters (`/es/cortos?genre=horror`) and count for «Si te ha gustado». The AI review
 * proposes them; an editor can change them.
 */
export const SHORT_GENRES = [
  'drama',
  'comedy',
  'horror',
  'thriller',
  'science-fiction',
  'fantasy',
  'romance',
  'action-adventure',
  'musical-dance',
] as const
export type ShortGenre = (typeof SHORT_GENRES)[number]

export const SHORT_THEMES = [
  'society',
  'lgbtiq',
  'family',
  'memory-history',
  'nature-environment',
  'sport',
] as const
export type ShortTheme = (typeof SHORT_THEMES)[number]

/** A short has at most this many genres, and as many themes. */
export const MAX_CLASSES = 2

export const GENRE_LABELS = {
  drama: label('Drama', 'Drama'),
  comedy: label('Comedy', 'Comedia'),
  horror: label('Horror', 'Terror'),
  thriller: label('Thriller', 'Thriller'),
  'science-fiction': label('Science fiction', 'Ciencia ficción'),
  fantasy: label('Fantasy', 'Fantástico'),
  romance: label('Romance', 'Romance'),
  'action-adventure': label('Action and adventure', 'Acción y aventura'),
  'musical-dance': label('Musical and dance', 'Musical y danza'),
} satisfies Record<ShortGenre, AdminLabel>

export const THEME_LABELS = {
  society: label('Society', 'Sociedad'),
  lgbtiq: label('LGBTIQ+', 'LGTBIQ+'),
  family: label('Family', 'Familia'),
  'memory-history': label('Memory and history', 'Memoria e historia'),
  'nature-environment': label('Nature and environment', 'Naturaleza y medio ambiente'),
  sport: label('Sport', 'Deporte'),
} satisfies Record<ShortTheme, AdminLabel>

/** Keeps the known values, in the order given (the main one first), without repeats, up to two. */
export function cleanClasses<T extends string>(values: readonly T[], value: unknown): T[] {
  if (!Array.isArray(value)) return []
  const known = value.filter((item): item is T => (values as readonly unknown[]).includes(item))
  return [...new Set(known)].slice(0, MAX_CLASSES)
}
