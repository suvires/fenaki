import type { TextField } from 'payload'
import { common } from '../labels.ts'

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
    label: common.slug,
    type: 'text',
    required: true,
    unique: true,
    index: true,
    localized: options.localized ?? false,
    admin: { position: 'sidebar', description: common.slugHelp },
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
