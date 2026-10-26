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
  sales: label('Sales', 'Comercial'),
  viewers: label('Viewers', 'Espectadores'),
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
  importKey: label('Import key', 'Clave de importación'),
  importKeyHelp: label(
    'Set by the catalog import. Re-running the import updates this document.',
    'La fija la importación del catálogo. Al repetirla, se actualiza este documento.',
  ),
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
  passwordTooShort: label(
    'The password must have at least 10 characters.',
    'La contraseña debe tener al menos 10 caracteres.',
  ),
  shortNotPublished: label(
    'Only published shorts can be added.',
    'Solo se pueden añadir cortos publicados.',
  ),
  nonCommercialInSponsored: label(
    'A sponsored collection cannot include non-commercial (NC) shorts:',
    'Una colección patrocinada no puede incluir cortos con licencia no comercial (NC):',
  ),
  requiredToPublish: label('Required to publish the short.', 'Hace falta para publicar el corto.'),
  noOfficialEvidence: label(
    'To publish a short, at least one of its sources needs its official channel and the evidence that it is official.',
    'Para publicar un corto, al menos una de sus fuentes necesita su canal oficial y la prueba de que es oficial.',
  ),
  unofficialInShowcase: label(
    'A showcase only includes shorts on official channels. These have no source with an official channel and its evidence:',
    'Un escaparate solo incluye cortos en canales oficiales. Estos no tienen una fuente con canal oficial y su prueba:',
  ),
  nonCommercialInShowcase: label(
    'A showcase cannot include non-commercial (NC) shorts:',
    'Un escaparate no puede incluir cortos con licencia no comercial (NC):',
  ),
  offCircuitRequired: label(
    'Confirm that no short is still on the festival circuit before publishing a festival showcase.',
    'Confirma que ningún corto sigue en el circuito de festivales antes de publicar el escaparate de un festival.',
  ),
  brandedInSponsored: label(
    'A sponsored collection cannot include branded content:',
    'Una colección patrocinada no puede incluir contenido de marca:',
  ),
}
