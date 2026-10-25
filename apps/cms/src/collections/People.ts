import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access.ts'
import { slugField } from '../fields/slug.ts'
import { queueIndexShort } from '../jobs/queue.ts'

export const People: CollectionConfig = {
  slug: 'people',
  admin: { useAsTitle: 'name', group: 'Catalog' },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'bio', type: 'textarea', localized: true },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        const credited = await req.payload.find({
          collection: 'shorts',
          where: { 'credits.person': { equals: doc.id } },
          depth: 0,
          limit: 0,
          pagination: false,
          req,
        })
        for (const short of credited.docs) await queueIndexShort(req, short.id)
      },
    ],
  },
}
