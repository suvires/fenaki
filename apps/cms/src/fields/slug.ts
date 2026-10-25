import type { TextField } from 'payload'

/** Lowercase ASCII words joined by hyphens: «7:35 de la mañana» → «7-35-de-la-manana». */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** A URL slug filled from another field when left empty. */
export function slugField(from: string, options: { localized?: boolean } = {}): TextField {
  return {
    name: 'slug',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    localized: options.localized ?? false,
    admin: { position: 'sidebar', description: 'Generated from the title when left empty.' },
    hooks: {
      beforeValidate: [
        ({ value, data }) => {
          const source = typeof value === 'string' && value ? value : data?.[from]
          return typeof source === 'string' ? slugify(source) : value
        },
      ],
    },
  }
}
