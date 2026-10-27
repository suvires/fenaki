import { ValidationError, type CollectionConfig, type PayloadRequest } from 'payload'
import { isAdmin, isAuthenticatedField, isStaffAccount } from '../access.ts'
import { ingestKeys } from '../ingest/metadata.ts'
import { scanChannelEndpoint } from '../ingest/channels/endpoint.ts'
import { resolveChannel, type ResolveFailure } from '../ingest/channels/resolve.ts'
import { groups, inLanguage, label, options, type AdminLabel } from '../labels.ts'
import type { CHANNEL_KINDS } from './Sources.ts'

export const CHANNEL_PROVIDERS = ['youtube', 'vimeo'] as const

/** The shortest and longest running times the scanner takes for a short, in seconds. */
export const DEFAULT_MIN_SECONDS = 120
export const DEFAULT_MAX_SECONDS = 2700

const errors = {
  'invalid-url': label(
    'Paste the URL of a YouTube channel (youtube.com/@name or /channel/UC…) or of a Vimeo user or channel.',
    'Pega la URL de un canal de YouTube (youtube.com/@nombre o /channel/UC…) o de un usuario o canal de Vimeo.',
  ),
  'no-api-key': label(
    'YouTube channels need YOUTUBE_API_KEY in the CMS environment.',
    'Los canales de YouTube necesitan YOUTUBE_API_KEY en el entorno del CMS.',
  ),
  'not-found': label(
    'The provider does not know this channel.',
    'El proveedor no conoce este canal.',
  ),
  unreachable: label(
    'The provider did not answer. Try again in a few minutes.',
    'El proveedor no ha respondido. Prueba de nuevo en unos minutos.',
  ),
} satisfies Record<ResolveFailure | 'unreachable', AdminLabel>

/** An official channel whose new shorts the nightly scan adds to the review queue. */
export const Channels: CollectionConfig = {
  slug: 'channels',
  labels: { singular: label('Channel', 'Canal'), plural: label('Channels', 'Canales') },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'provider', 'kind', 'active', 'lastScannedAt'],
    group: groups.catalog,
    listSearchableFields: ['name', 'url'],
  },
  endpoints: [scanChannelEndpoint],
  access: {
    read: ({ req }) => isStaffAccount(req.user),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'url',
          label: label('Channel URL', 'URL del canal'),
          type: 'text',
          required: true,
          admin: {
            description: label(
              'YouTube (@name, /channel/UC…) or Vimeo (user or channel). The provider and the channel ID are filled in when you save.',
              'YouTube (@nombre, /channel/UC…) o Vimeo (usuario o canal). El proveedor y el ID del canal se rellenan al guardar.',
            ),
          },
        },
        {
          name: 'name',
          label: label('Name', 'Nombre'),
          type: 'text',
          admin: {
            description: label(
              'Filled in from the provider when left empty.',
              'Se rellena desde el proveedor si lo dejas vacío.',
            ),
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          label: label('Provider', 'Proveedor'),
          type: 'select',
          required: true,
          defaultValue: 'youtube',
          options: options({
            youtube: label('YouTube', 'YouTube'),
            vimeo: label('Vimeo', 'Vimeo'),
          }),
          admin: { readOnly: true },
        },
        {
          name: 'externalId',
          label: label('Channel ID', 'ID del canal'),
          type: 'text',
          index: true,
          admin: { readOnly: true },
        },
        {
          name: 'kind',
          label: label('Who runs it', 'Quién lo gestiona'),
          type: 'select',
          required: true,
          options: options({
            author: label('Author', 'Autor'),
            producer: label('Producer', 'Productora'),
            distributor: label('Distributor', 'Distribuidora'),
            festival: label('Festival', 'Festival'),
            school: label('Film school', 'Escuela de cine'),
            institution: label('Institution', 'Institución'),
          } satisfies Record<(typeof CHANNEL_KINDS)[number], AdminLabel>),
        },
      ],
    },
    {
      name: 'organization',
      label: label('Organization', 'Organización'),
      type: 'relationship',
      relationTo: 'organizations',
    },
    {
      name: 'officialEvidence',
      label: label('Evidence that the channel is official', 'Prueba de que el canal es oficial'),
      type: 'textarea',
      access: { read: isAuthenticatedField },
      admin: {
        description: label(
          'What shows the channel belongs to the rights holder (links from the official website, the festival or the credits), and when it was checked. Copied to every short the scan adds.',
          'Qué demuestra que el canal es del titular (enlaces desde la web oficial, el festival o los créditos) y cuándo se comprobó. Se copia a cada corto que añade la búsqueda.',
        ),
      },
    },
    {
      name: 'active',
      label: label('Active', 'Activo'),
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: label(
          'The nightly scan only looks at active channels.',
          'La búsqueda nocturna solo mira los canales activos.',
        ),
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'minDurationSeconds',
          label: label('Shortest, in seconds', 'Duración mínima, en segundos'),
          type: 'number',
          required: true,
          defaultValue: DEFAULT_MIN_SECONDS,
          min: 0,
        },
        {
          name: 'maxDurationSeconds',
          label: label('Longest, in seconds', 'Duración máxima, en segundos'),
          type: 'number',
          required: true,
          defaultValue: DEFAULT_MAX_SECONDS,
          min: 1,
        },
        {
          name: 'defaultLanguage',
          label: label('Spoken language', 'Idioma hablado'),
          type: 'text',
          admin: {
            description: label(
              'BCP 47 code, e.g. es. Used when the provider does not say.',
              'Código BCP 47, por ejemplo es. Se usa cuando el proveedor no lo indica.',
            ),
          },
          validate: (value: string | null | undefined, { req }: { req: PayloadRequest }) =>
            !value ||
            /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value) ||
            inLanguage(
              label('Use a BCP 47 language code.', 'Usa un código de idioma BCP 47.'),
              req.i18n?.language,
            ),
        },
      ],
    },
    {
      name: 'scanChannel',
      type: 'ui',
      admin: {
        condition: (data) => Boolean(data?.id),
        components: { Field: '/admin/ScanChannelButton.tsx#ScanChannelButton' },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lastScannedAt',
          label: label('Last scanned', 'Última búsqueda'),
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'lastScanNote',
          label: label('Last scan', 'Última búsqueda'),
          type: 'textarea',
          admin: {
            readOnly: true,
            description: label(
              'How many videos the last scan found, added and skipped, and why.',
              'Cuántos vídeos encontró, añadió y descartó la última búsqueda, y por qué.',
            ),
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const url = typeof data.url === 'string' ? data.url : originalDoc?.url
        const changed = typeof data.url === 'string' && data.url !== originalDoc?.url
        if (!url || (!changed && originalDoc?.externalId)) return data
        const fail = (key: keyof typeof errors) => {
          throw new ValidationError({
            collection: 'channels',
            errors: [{ path: 'url', message: inLanguage(errors[key], req.i18n?.language) }],
            req,
          })
        }
        let resolved
        try {
          resolved = await resolveChannel(url, ingestKeys())
        } catch {
          return fail('unreachable')
        }
        if ('failure' in resolved) return fail(resolved.failure)
        data.provider = resolved.provider
        data.externalId = resolved.externalId
        if (!(data.name ?? originalDoc?.name)) data.name = resolved.name
        return data
      },
    ],
  },
}
