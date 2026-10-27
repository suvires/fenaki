import type { GlobalConfig } from 'payload'
import { isAdmin, isStaffAccount } from '../access.ts'
import { DEFAULT_CATALOG_LANGUAGES } from '../ingest/languages.ts'
import { groups, label } from '../labels.ts'

/**
 * Catalog-wide choices for the scanners. Today the catalog is Spanish; adding a language here
 * and re-evaluating the channels' skipped videos brings in the ones left out for their language.
 */
export const CatalogSettings: GlobalConfig = {
  slug: 'catalog-settings',
  label: label('Catalog settings', 'Ajustes del catálogo'),
  admin: { group: groups.catalog },
  access: { read: ({ req }) => isStaffAccount(req.user), update: isAdmin },
  fields: [
    {
      name: 'catalogLanguages',
      label: label('Catalog languages', 'Idiomas del catálogo'),
      type: 'text',
      hasMany: true,
      defaultValue: DEFAULT_CATALOG_LANGUAGES,
      admin: {
        description: label(
          'BCP 47 codes. A scanned short enters when it is spoken in one of them, has no dialogue, or has subtitles in one. The others stay in the scanned videos, with their language.',
          'Códigos BCP 47. Un corto escaneado entra si se habla en uno de ellos, no tiene diálogos o tiene subtítulos en uno. Los demás se quedan en los vídeos escaneados, con su idioma.',
        ),
      },
    },
  ],
}
