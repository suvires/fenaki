import type { CollectionConfig } from 'payload'
import { isAdmin, isStaffAccount } from '../access.ts'
import type { LANGUAGE_SOURCES } from '../ingest/languages.ts'
import { SKIP_REASONS } from '../ingest/channels/rules.ts'
import { skipReasonLabels } from '../ingest/channels/reasonLabels.ts'
import { groups, label, options, type AdminLabel } from '../labels.ts'
import {
  addScannedVideoEndpoint,
  reevaluateScannedVideoEndpoint,
} from '../ingest/channels/ledgerEndpoints.ts'

export const LEDGER_OUTCOMES = ['added', 'skipped'] as const
/** The scanner's skip reasons, plus the videos it could not check or save (retried next run). */
export const LEDGER_SKIP_REASONS = [...SKIP_REASONS, 'failed'] as const

const languageField = (name: string, text: AdminLabel, help: AdminLabel) => ({
  name,
  label: text,
  type: 'text' as const,
  hasMany: true,
  admin: { description: help },
})

/**
 * Every video the channel scans have looked at, once: what became a short and what was left out
 * and why. The scanner consults it before doing any work on a video, so nothing is fetched or
 * judged twice; an editor can bring a skipped video in, or ask for another look.
 */
export const ScannedVideos: CollectionConfig = {
  slug: 'scanned-videos',
  labels: {
    singular: label('Scanned video', 'Vídeo escaneado'),
    plural: label('Scanned videos', 'Vídeos escaneados'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'channel', 'outcome', 'skipReason', 'durationSeconds', 'lastSeenAt'],
    group: groups.catalog,
    listSearchableFields: ['title', 'externalId'],
  },
  endpoints: [addScannedVideoEndpoint, reevaluateScannedVideoEndpoint],
  indexes: [{ fields: ['provider', 'externalId'], unique: true }],
  access: {
    read: ({ req }) => isStaffAccount(req.user),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'channel',
      label: label('Channel', 'Canal'),
      type: 'relationship',
      relationTo: 'channels',
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
    { name: 'url', label: label('URL', 'URL'), type: 'text' },
    {
      type: 'row',
      fields: [
        { name: 'title', label: label('Title', 'Título'), type: 'text' },
        {
          name: 'durationSeconds',
          label: label('Duration (seconds)', 'Duración (segundos)'),
          type: 'number',
        },
        {
          name: 'publishedAt',
          label: label('Published on the provider', 'Publicado en el proveedor'),
          type: 'date',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'outcome',
          label: label('Outcome', 'Resultado'),
          type: 'select',
          required: true,
          index: true,
          options: options({
            added: label('Added to the catalog', 'Añadido al catálogo'),
            skipped: label('Skipped', 'Descartado'),
          }),
        },
        {
          name: 'skipReason',
          label: label('Why it was skipped', 'Por qué se descartó'),
          type: 'select',
          index: true,
          options: options(skipReasonLabels),
          admin: {
            condition: (data) => data?.outcome === 'skipped',
            description: label(
              'Failed videos are retried by the next scan; the rest are not looked at again unless re-evaluated.',
              'Los vídeos con fallo se reintentan en la próxima búsqueda; el resto no se vuelve a mirar salvo que se reevalúe.',
            ),
          },
        },
      ],
    },
    {
      name: 'short',
      label: label('Short', 'Corto'),
      type: 'relationship',
      relationTo: 'shorts',
      admin: { condition: (data) => data?.outcome === 'added' },
    },
    { name: 'note', label: label('Note', 'Nota'), type: 'textarea' },
    {
      type: 'collapsible',
      label: label('Languages', 'Idiomas'),
      admin: { initCollapsed: true },
      fields: [
        languageField(
          'spokenLanguages',
          label('Spoken', 'Hablado'),
          label(
            'ISO 639-1 codes, or zxx for no dialogue. Empty when nobody said.',
            'Códigos ISO 639-1, o zxx si no hay diálogos. Vacío si nadie lo indicó.',
          ),
        ),
        languageField(
          'subtitles',
          label('Human subtitles', 'Subtítulos humanos'),
          label('Languages of human-made subtitles.', 'Idiomas de subtítulos hechos por personas.'),
        ),
        languageField(
          'autoSubtitles',
          label('Automatic subtitles', 'Subtítulos automáticos'),
          label('Languages of automatic subtitles.', 'Idiomas de subtítulos automáticos.'),
        ),
        {
          name: 'captions',
          label: label('Caption track', 'Pista de subtítulos'),
          type: 'select',
          options: options({
            yes: label('The provider says there is one', 'El proveedor dice que hay'),
            no: label('None', 'Ninguna'),
          }),
          admin: {
            description: label(
              'YouTube only says whether a track exists, not its language.',
              'YouTube solo dice si existe una pista, no su idioma.',
            ),
          },
        },
        {
          name: 'languageSource',
          label: label('Where the languages come from', 'De dónde salen los idiomas'),
          type: 'select',
          options: options({
            provider: label('Provider metadata', 'Metadatos del proveedor'),
            channel: label('The channel’s default language', 'Idioma por defecto del canal'),
            ai: label('AI analysis', 'Análisis de la IA'),
            editor: label('An editor', 'Un editor'),
          } satisfies Record<(typeof LANGUAGE_SOURCES)[number], AdminLabel>),
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'firstSeenAt',
          label: label('First seen', 'Visto por primera vez'),
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'lastSeenAt',
          label: label('Last seen', 'Visto por última vez'),
          type: 'date',
          index: true,
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'reevaluate',
      label: label('Look at it again', 'Volver a evaluar'),
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: label(
          'The next scan of the channel judges it again with the current rules, then clears this.',
          'La próxima búsqueda del canal lo juzga de nuevo con las reglas actuales y quita esta marca.',
        ),
      },
    },
    {
      name: 'actions',
      type: 'ui',
      admin: {
        condition: (data) => Boolean(data?.id),
        components: { Field: '/admin/ScannedVideoActions.tsx#ScannedVideoActions' },
      },
    },
  ],
}
