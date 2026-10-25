/**
 * Admin panel labels. Each one follows the language of whoever uses the panel (Payload's
 * language selector), independent of the content locales.
 */
export type AdminLabel = { en: string; es: string }

export const label = (en: string, es: string): AdminLabel => ({ en, es })

/** Select options with translated labels. */
export function options<V extends string>(entries: Record<V, AdminLabel>) {
  return (Object.entries(entries) as [V, AdminLabel][]).map(([value, text]) => ({
    value,
    label: text,
  }))
}

export const groups = {
  catalog: label('Catalog', 'Catálogo'),
  rights: label('Rights', 'Derechos'),
  sponsorship: label('Sponsorship', 'Patrocinio'),
  admin: label('Admin', 'Administración'),
}

export const common = {
  slug: label('Slug', 'Slug'),
  slugHelp: label(
    'Part of the URL. Generated from the title when left empty.',
    'Parte de la URL. Se genera a partir del título si lo dejas vacío.',
  ),
  status: label('Status', 'Estado'),
  sample: label('Sample data', 'Datos de ejemplo'),
  sampleHelp: label(
    'Sample data for development, not a catalog entry.',
    'Datos de ejemplo para desarrollo, no forman parte del catálogo.',
  ),
  title: label('Title', 'Título'),
  name: label('Name', 'Nombre'),
  notes: label('Internal notes', 'Notas internas'),
  notesHelp: label('Internal. Never shown publicly.', 'Internas. Nunca se muestran al público.'),
}

/** A label in the language of the panel user who triggered a validation or hook. */
export function inLanguage(text: AdminLabel, language: string | undefined): string {
  return language === 'es' ? text.es : text.en
}

export const messages = {
  countryCode: label(
    'Use a two-letter uppercase country code.',
    'Usa un código de país de dos letras en mayúsculas.',
  ),
  languageCode: label('Use a BCP 47 language code.', 'Usa un código de idioma BCP 47.'),
  nonCommercialInSponsored: label(
    'A sponsored collection cannot include non-commercial (NC) shorts:',
    'Una colección patrocinada no puede incluir cortos con licencia no comercial (NC):',
  ),
}
