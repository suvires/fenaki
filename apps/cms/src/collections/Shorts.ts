import type { CollectionConfig, PayloadRequest } from 'payload'
import { publishedOrAuthenticated } from '../access.ts'
import { importKeyField } from '../fields/importKey.ts'
import { slugField } from '../fields/slug.ts'
import { statusField } from '../fields/status.ts'
import { queueIndexShort } from '../jobs/queue.ts'
import { common, groups, inLanguage, label, messages, options } from '../labels.ts'

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
  labels: { singular: label('Short', 'Corto'), plural: label('Shorts', 'Cortos') },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'year', 'durationSeconds', 'status', 'sample'],
    group: groups.catalog,
  },
  access: { read: publishedOrAuthenticated },
  defaultSort: '-publishedAt',
  fields: [
    { name: 'title', label: common.title, type: 'text', required: true, localized: true },
    slugField('title', { localized: true }),
    {
      name: 'synopsis',
      label: label('Synopsis', 'Sinopsis'),
      type: 'textarea',
      localized: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'durationSeconds',
          label: label('Duration (seconds)', 'Duración (segundos)'),
          type: 'number',
          required: true,
          min: 1,
          admin: { description: label('Running time in seconds.', 'Duración en segundos.') },
        },
        { name: 'year', label: label('Year', 'Año'), type: 'number', min: 1888, max: 2100 },
        {
          name: 'country',
          label: label('Country', 'País'),
          type: 'text',
          admin: {
            description: label(
              'ISO 3166-1 alpha-2 code, e.g. ES.',
              'Código ISO 3166-1 alfa-2, por ejemplo ES.',
            ),
          },
          validate: (value: string | null | undefined, { req }: { req: PayloadRequest }) =>
            !value ||
            /^[A-Z]{2}$/.test(value) ||
            inLanguage(messages.countryCode, req.i18n?.language),
        },
        {
          name: 'originalLanguage',
          label: label('Original language', 'Idioma original'),
          type: 'text',
          admin: {
            description: label(
              'BCP 47 code, e.g. es. Use zxx for no dialogue.',
              'Código BCP 47, por ejemplo es. Usa zxx si no tiene diálogos.',
            ),
          },
          validate: (value: string | null | undefined, { req }: { req: PayloadRequest }) =>
            !value ||
            /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value) ||
            inLanguage(messages.languageCode, req.i18n?.language),
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          label: label('Type', 'Tipo'),
          type: 'select',
          required: true,
          options: options({
            fiction: label('Fiction', 'Ficción'),
            documentary: label('Documentary', 'Documental'),
            animation: label('Animation', 'Animación'),
            experimental: label('Experimental', 'Experimental'),
          }),
        },
        {
          name: 'noDialogue',
          label: label('No dialogue', 'Sin diálogos'),
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'posterTone',
          label: label('Poster tone', 'Tono del póster'),
          type: 'select',
          defaultValue: 'sala',
          options: options({
            sala: label('Sala (dark)', 'Sala (oscuro)'),
            tungsteno: label('Tungsteno (amber)', 'Tungsteno (ámbar)'),
            plata: label('Plata (silver)', 'Plata (plateado)'),
          }),
          admin: {
            description: label(
              'Typographic poster tone until the short has cleared art.',
              'Tono del póster tipográfico hasta que el corto tenga arte con derechos.',
            ),
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'brandedContent',
          label: label('Branded content', 'Contenido de marca'),
          type: 'checkbox',
          defaultValue: false,
          index: true,
          admin: {
            description: label(
              'Made by or for a brand. Shown with a «Contenido de marca» badge, and never in a sponsored collection.',
              'Hecho por o para una marca. Se muestra con la etiqueta «Contenido de marca» y nunca entra en una colección patrocinada.',
            ),
          },
        },
        {
          name: 'brand',
          label: label('Brand', 'Marca'),
          type: 'text',
          admin: {
            condition: (data) => Boolean(data?.brandedContent),
            description: label(
              'The brand behind the short, e.g. Fundación Telefónica.',
              'La marca que está detrás del corto, por ejemplo Fundación Telefónica.',
            ),
          },
        },
      ],
    },
    {
      name: 'credits',
      label: label('Credits', 'Créditos'),
      labels: { singular: label('Credit', 'Crédito'), plural: label('Credits', 'Créditos') },
      type: 'array',
      admin: {
        description: label(
          'People and their role on this short.',
          'Personas y su función en este corto.',
        ),
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'person',
              label: label('Person', 'Persona'),
              type: 'relationship',
              relationTo: 'people',
              required: true,
            },
            {
              name: 'role',
              label: label('Role', 'Función'),
              type: 'select',
              required: true,
              defaultValue: 'director',
              options: options({
                director: label('Director', 'Dirección'),
                writer: label('Writer', 'Guion'),
                producer: label('Producer', 'Producción'),
                cinematographer: label('Cinematographer', 'Fotografía'),
                editor: label('Editor', 'Montaje'),
                composer: label('Composer', 'Música'),
                cast: label('Cast', 'Reparto'),
              }),
            },
          ],
        },
      ],
    },
    {
      name: 'sources',
      label: label('Sources', 'Fuentes'),
      type: 'join',
      collection: 'sources',
      on: 'short',
      admin: {
        description: label(
          'Where the short plays from. Each source has its own license.',
          'Desde dónde se reproduce el corto. Cada fuente tiene su propia licencia.',
        ),
      },
    },
    statusField(['draft', 'published', 'withdrawn']),
    {
      name: 'publishedAt',
      label: label('Published at', 'Fecha de publicación'),
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        description: label('Set when first published.', 'Se fija al publicarlo por primera vez.'),
      },
    },
    {
      name: 'sample',
      label: common.sample,
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: common.sampleHelp },
    },
    importKeyField(),
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
