import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access.ts'
import { queueIndexShort } from '../jobs/queue.ts'
import { groups, label, options } from '../labels.ts'

export const PROVIDERS = ['youtube', 'vimeo', 'bunny'] as const

export const Sources: CollectionConfig = {
  slug: 'sources',
  labels: { singular: label('Source', 'Fuente'), plural: label('Sources', 'Fuentes') },
  admin: {
    useAsTitle: 'externalId',
    defaultColumns: ['short', 'provider', 'externalId', 'status', 'lastCheckedAt'],
    group: groups.catalog,
  },
  access: {
    read: ({ req }) => (req.user ? true : { 'short.status': { equals: 'published' } }),
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'short',
      label: label('Short', 'Corto'),
      type: 'relationship',
      relationTo: 'shorts',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          label: label('Provider', 'Proveedor'),
          type: 'select',
          required: true,
          options: options({
            youtube: label('YouTube', 'YouTube'),
            vimeo: label('Vimeo', 'Vimeo'),
            bunny: label('Bunny Stream', 'Bunny Stream'),
          }),
        },
        {
          name: 'externalId',
          label: label('External ID', 'ID externo'),
          type: 'text',
          required: true,
          index: true,
        },
      ],
    },
    {
      name: 'url',
      label: label('URL', 'URL'),
      type: 'text',
      admin: {
        description: label(
          'Public page of the video on the provider.',
          'Página pública del corto en el proveedor.',
        ),
      },
    },
    {
      name: 'subtitles',
      label: label('Subtitles', 'Subtítulos'),
      type: 'text',
      hasMany: true,
      admin: {
        description: label(
          'BCP 47 codes of the available subtitles, e.g. es, en.',
          'Códigos BCP 47 de los subtítulos disponibles, por ejemplo es, en.',
        ),
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'embeddable',
          label: label('Embeddable', 'Se puede incrustar'),
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'status',
          label: label('Embed status', 'Estado del embed'),
          type: 'select',
          required: true,
          defaultValue: 'unchecked',
          options: options({
            unchecked: label('Unchecked', 'Sin comprobar'),
            ok: label('OK', 'Correcto'),
            broken: label('Broken', 'Roto'),
            private: label('Private', 'Privado'),
          }),
          admin: {
            description: label(
              'Set by the nightly embed checker.',
              'Lo fija la comprobación nocturna de embeds.',
            ),
          },
        },
        {
          name: 'lastCheckedAt',
          label: label('Last checked', 'Última comprobación'),
          type: 'date',
        },
      ],
    },
    {
      name: 'license',
      label: label('License', 'Licencia'),
      type: 'relationship',
      relationTo: 'licenses',
      required: true,
    },
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
