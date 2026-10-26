import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticatedField, isStaffAccount } from '../access.ts'
import { importKeyField } from '../fields/importKey.ts'
import { checkEmbedsEndpoint } from '../jobs/checkEmbedsEndpoint.ts'
import { queueIndexShort } from '../jobs/queue.ts'
import { groups, label, options } from '../labels.ts'

export const PROVIDERS = ['youtube', 'vimeo', 'bunny'] as const

/** Who runs the channel a source plays from. Only official channels enter the catalog. */
export const CHANNEL_KINDS = [
  'author',
  'producer',
  'distributor',
  'festival',
  'school',
  'institution',
] as const
export type ChannelKind = (typeof CHANNEL_KINDS)[number]

export const Sources: CollectionConfig = {
  slug: 'sources',
  labels: { singular: label('Source', 'Fuente'), plural: label('Sources', 'Fuentes') },
  admin: {
    useAsTitle: 'externalId',
    defaultColumns: ['short', 'provider', 'externalId', 'status', 'lastCheckedAt'],
    group: groups.catalog,
  },
  endpoints: [checkEmbedsEndpoint],
  access: {
    read: ({ req }) =>
      isStaffAccount(req.user) ? true : { 'short.status': { equals: 'published' } },
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
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
      name: 'channel',
      label: label('Official channel', 'Canal oficial'),
      type: 'group',
      admin: {
        description: label(
          'Only official channels (author, producer, distributor, festival, school or institution) enter the catalog. The legal route of an embed depends on it.',
          'Solo entran canales oficiales (autor, productora, distribuidora, festival, escuela o institución). La vía legal del embed depende de ello.',
        ),
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: label('Channel', 'Canal'), type: 'text' },
            {
              name: 'kind',
              label: label('Who runs it', 'Quién lo gestiona'),
              type: 'select',
              options: options({
                author: label('Author', 'Autor'),
                producer: label('Producer', 'Productora'),
                distributor: label('Distributor', 'Distribuidora'),
                festival: label('Festival', 'Festival'),
                school: label('Film school', 'Escuela de cine'),
                institution: label('Institution', 'Institución'),
              }),
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'url', label: label('Channel URL', 'URL del canal'), type: 'text' },
            {
              name: 'externalId',
              label: label('Channel ID', 'ID del canal'),
              type: 'text',
              admin: {
                description: label(
                  'Filled from the provider when available.',
                  'Se rellena desde el proveedor cuando está disponible.',
                ),
              },
            },
          ],
        },
      ],
    },
    {
      name: 'officialEvidence',
      label: label('Evidence that the channel is official', 'Prueba de que el canal es oficial'),
      type: 'textarea',
      access: { read: isAuthenticatedField },
      admin: {
        description: label(
          'What shows the channel belongs to the rights holder (links from the official website, the festival or the credits), and when it was checked. Required to publish the short.',
          'Qué demuestra que el canal es del titular (enlaces desde la web oficial, el festival o los créditos) y cuándo se comprobó. Obligatoria para publicar el corto.',
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
      type: 'row',
      fields: [
        {
          name: 'ageRestricted',
          label: label('Age restricted', 'Restringido por edad'),
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: label(
              'Age-restricted videos do not play embedded.',
              'Los vídeos con restricción de edad no se reproducen incrustados.',
            ),
          },
        },
        {
          name: 'problemSince',
          label: label('Problem since', 'Problema desde'),
          type: 'date',
          admin: {
            description: label(
              'When the checker first found it unplayable.',
              'Cuándo la comprobación la encontró sin reproducción por primera vez.',
            ),
          },
        },
      ],
    },
    {
      name: 'checkNote',
      label: label('Last check', 'Última comprobación'),
      type: 'text',
      access: { read: isAuthenticatedField },
      admin: {
        readOnly: true,
        description: label(
          'What the last check found, in the checker’s words.',
          'Lo que encontró la última comprobación.',
        ),
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'thumbnailUrl',
          label: label('Provider thumbnail', 'Miniatura del proveedor'),
          type: 'text',
          access: { read: isAuthenticatedField },
          admin: {
            description: label(
              'Where the checker downloads the still from (Vimeo). Visitors never load it: Fenaki serves its own copy from the Stills collection.',
              'De dónde descarga el fotograma la comprobación (Vimeo). Los visitantes nunca la cargan: Fenaki sirve su propia copia desde Fotogramas.',
            ),
          },
        },
        {
          name: 'uploadedAt',
          label: label('Published on the provider', 'Publicado en el proveedor'),
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
    importKeyField(),
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
