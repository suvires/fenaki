import type { CollectionConfig } from 'payload'
import { publishedOrAuthenticated } from '../access.ts'
import { slugField } from '../fields/slug.ts'
import { statusField } from '../fields/status.ts'
import { queueIndexShort } from '../jobs/queue.ts'

export const SHORT_TYPES = ['fiction', 'documentary', 'animation', 'experimental'] as const
export const CREDIT_ROLES = [
  'director',
  'writer',
  'producer',
  'cinematographer',
  'editor',
  'composer',
  'cast',
] as const

export const Shorts: CollectionConfig = {
  slug: 'shorts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'year', 'durationSeconds', 'status', 'sample'],
    group: 'Catalog',
  },
  access: { read: publishedOrAuthenticated },
  defaultSort: '-publishedAt',
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField('title', { localized: true }),
    { name: 'synopsis', type: 'textarea', localized: true },
    {
      type: 'row',
      fields: [
        {
          name: 'durationSeconds',
          type: 'number',
          required: true,
          min: 1,
          admin: { description: 'Running time in seconds.' },
        },
        { name: 'year', type: 'number', min: 1888, max: 2100 },
        {
          name: 'country',
          type: 'text',
          admin: { description: 'ISO 3166-1 alpha-2 code, e.g. ES.' },
          validate: (value: string | null | undefined) =>
            !value || /^[A-Z]{2}$/.test(value) || 'Use a two-letter uppercase country code.',
        },
        {
          name: 'originalLanguage',
          type: 'text',
          admin: { description: 'BCP 47 code, e.g. es. Use zxx for no dialogue.' },
          validate: (value: string | null | undefined) =>
            !value || /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value) || 'Use a BCP 47 code.',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          options: SHORT_TYPES.map((value) => ({ value, label: value })),
        },
        { name: 'noDialogue', type: 'checkbox', defaultValue: false },
        {
          name: 'posterTone',
          type: 'select',
          defaultValue: 'sala',
          options: ['sala', 'tungsteno', 'plata'].map((value) => ({ value, label: value })),
          admin: { description: 'Typographic poster tone until the short has cleared art.' },
        },
      ],
    },
    {
      name: 'credits',
      type: 'array',
      admin: { description: 'People and their role on this short.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'person', type: 'relationship', relationTo: 'people', required: true },
            {
              name: 'role',
              type: 'select',
              required: true,
              defaultValue: 'director',
              options: CREDIT_ROLES.map((value) => ({ value, label: value })),
            },
          ],
        },
      ],
    },
    {
      name: 'sources',
      type: 'join',
      collection: 'sources',
      on: 'short',
      admin: { description: 'Where the short plays from. Each source has its own license.' },
    },
    statusField(['draft', 'published', 'withdrawn']),
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', description: 'Set when first published.' },
    },
    {
      name: 'sample',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Sample data for development, not a catalog entry.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.status === 'published' && !data.publishedAt)
          data.publishedAt = new Date().toISOString()
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (doc.status === 'published' || previousDoc?.status === 'published') {
          await queueIndexShort(req, doc.id)
        }
      },
    ],
    afterDelete: [({ doc, req }) => queueIndexShort(req, doc.id)],
  },
}
