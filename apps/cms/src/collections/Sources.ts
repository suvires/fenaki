import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access.ts'
import { queueIndexShort } from '../jobs/queue.ts'

export const PROVIDERS = ['youtube', 'vimeo', 'bunny'] as const

export const Sources: CollectionConfig = {
  slug: 'sources',
  admin: {
    useAsTitle: 'externalId',
    defaultColumns: ['short', 'provider', 'externalId', 'status', 'lastCheckedAt'],
    group: 'Catalog',
  },
  access: {
    read: ({ req }) => (req.user ? true : { 'short.status': { equals: 'published' } }),
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'short', type: 'relationship', relationTo: 'shorts', required: true, index: true },
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          type: 'select',
          required: true,
          options: PROVIDERS.map((value) => ({ value, label: value })),
        },
        { name: 'externalId', type: 'text', required: true, index: true },
      ],
    },
    {
      name: 'url',
      type: 'text',
      admin: { description: 'Public page of the video on the provider.' },
    },
    {
      name: 'subtitles',
      type: 'text',
      hasMany: true,
      admin: { description: 'BCP 47 codes of the available subtitles, e.g. es, en.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'embeddable', type: 'checkbox', defaultValue: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'unchecked',
          options: ['unchecked', 'ok', 'broken', 'private'].map((value) => ({
            value,
            label: value,
          })),
          admin: { description: 'Set by the nightly embed checker.' },
        },
        { name: 'lastCheckedAt', type: 'date' },
      ],
    },
    { name: 'license', type: 'relationship', relationTo: 'licenses', required: true },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        const shortId = typeof doc.short === 'object' ? doc.short.id : doc.short
        await queueIndexShort(req, shortId)
      },
    ],
  },
}
