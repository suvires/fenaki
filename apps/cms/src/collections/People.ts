import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access.ts'
import { importKeyField } from '../fields/importKey.ts'
import { slugField } from '../fields/slug.ts'
import { queueIndexShort } from '../jobs/queue.ts'
import { common, groups, label } from '../labels.ts'

export const People: CollectionConfig = {
  slug: 'people',
  labels: { singular: label('Person', 'Persona'), plural: label('People', 'Personas') },
  admin: { useAsTitle: 'name', group: groups.catalog },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'name', label: common.name, type: 'text', required: true },
    slugField('name'),
    { name: 'bio', label: label('Bio', 'Biografía'), type: 'textarea', localized: true },
    importKeyField(),
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
