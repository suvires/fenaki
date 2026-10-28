import type { CollectionConfig, PayloadRequest, Validate } from 'payload'
import { isAdmin, isAuthenticatedField, publishedOrAuthenticated } from '../access.ts'
import { aiReviewField } from '../fields/aiReview.ts'
import { importKeyField } from '../fields/importKey.ts'
import { requiredToPublish } from '../fields/requiredToPublish.ts'
import { GENRE_LABELS, MAX_CLASSES, THEME_LABELS } from '../catalog/taxonomy.ts'
import { analyzeShortEndpoint, applyReviewEndpoint } from '../ai/endpoints.ts'
import { relatedShortsEndpoint } from '../related/related.ts'
import { addFromUrlEndpoint } from '../ingest/addFromUrl.ts'
import { slugField } from '../fields/slug.ts'
import { statusField } from '../fields/status.ts'
import { queueIndexShort } from '../jobs/queue.ts'
import { common, groups, inLanguage, label, messages, options } from '../labels.ts'

export const SHORT_TYPES = ['fiction', 'documentary', 'animation', 'experimental'] as const

/** Genres and themes: at most two each. */
const atMostTwo = (value: unknown, { req }: { req: PayloadRequest }) =>
  !Array.isArray(value) ||
  value.length <= MAX_CLASSES ||
  inLanguage(messages.atMostTwo, req.i18n?.language)

/** Why the embed checker hid a short. */
export const HIDDEN_REASONS = ['broken', 'private', 'not-embeddable', 'age-restricted'] as const
export type HiddenReason = (typeof HIDDEN_REASONS)[number]

export const CREDIT_ROLES = [
  'director',
  'writer',
  'producer',
  'cinematographer',
  'editor',
  'composer',
  'cast',
] as const

/**
 * Editors publish only shorts whose channel is on record as official. The catalog import (no
 * user) carries its own evidence and writes sources after shorts.
 */
const officialToPublish: Validate = async (value, { data, event, id, previousValue, req }) => {
  if (value !== 'published' || previousValue === 'published') return true
  if (event === 'onChange' || !req.user || !id || (data as { sample?: boolean }).sample) return true
  const official = await req.payload.count({
    collection: 'sources',
    where: {
      short: { equals: id },
      'channel.name': { exists: true, not_equals: '' },
      officialEvidence: { exists: true, not_equals: '' },
    },
    req,
  })
  return official.totalDocs > 0 || inLanguage(messages.noOfficialEvidence, req.i18n?.language)
}

export const Shorts: CollectionConfig = {
  slug: 'shorts',
  labels: { singular: label('Short', 'Corto'), plural: label('Shorts', 'Cortos') },
  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'year',
      'durationSeconds',
      'status',
      'aiReview.recommendation',
      'sample',
    ],
    group: groups.catalog,
    components: { beforeListTable: ['/admin/AddFromUrl.tsx#AddFromUrl'] },
  },
  endpoints: [addFromUrlEndpoint, analyzeShortEndpoint, applyReviewEndpoint, relatedShortsEndpoint],
  access: {
    read: publishedOrAuthenticated,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  defaultSort: '-publishedAt',
  fields: [
    { name: 'title', label: common.title, type: 'text', required: true, localized: true },
    slugField('title', { localized: true }),
    {
      name: 'previousSlugs',
      label: label('Previous addresses', 'Direcciones anteriores'),
      type: 'text',
      hasMany: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: label(
          'Slugs the short had before, in any language: they redirect to the current one.',
          'Slugs que tuvo antes, en cualquier idioma: redirigen al actual.',
        ),
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'originalTitle',
          label: label('Original title', 'Título original'),
          type: 'text',
          admin: {
            width: '50%',
            description: label(
              'Only when it differs from the title: the film was made in another language.',
              'Solo si es distinto del título: el corto se hizo en otro idioma.',
            ),
          },
        },
        {
          name: 'production',
          label: label('Production', 'Producción'),
          type: 'text',
          maxLength: 200,
          admin: {
            width: '50%',
            description: label(
              'The production company or the school, as the credits name them.',
              'La productora o la escuela, como la nombran los créditos.',
            ),
          },
        },
      ],
    },
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
          min: 1,
          validate: requiredToPublish,
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
          name: 'otherLanguages',
          label: label('Other spoken languages', 'Otros idiomas hablados'),
          type: 'text',
          hasMany: true,
          admin: {
            description: label(
              'BCP 47 codes, when more than one language is spoken. The first one goes in the original language.',
              'Códigos BCP 47, cuando se hablan varios idiomas. El primero va en el idioma original.',
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
          }),
          admin: {
            description: label(
              'An editor’s value is never replaced by the scan or the AI.',
              'El valor de un editor nunca lo sustituye la búsqueda ni la IA.',
            ),
          },
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
          validate: requiredToPublish,
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
          name: 'genres',
          label: label('Genres', 'Géneros'),
          type: 'select',
          hasMany: true,
          options: options(GENRE_LABELS),
          validate: atMostTwo,
          admin: {
            width: '40%',
            description: label(
              'Up to two, the main one first. A filter of the catalog; counts for «Si te ha gustado».',
              'Hasta dos, el principal primero. Es un filtro del catálogo y cuenta para «Si te ha gustado».',
            ),
          },
        },
        {
          name: 'themes',
          label: label('Themes', 'Temas'),
          type: 'select',
          hasMany: true,
          options: options(THEME_LABELS),
          validate: atMostTwo,
          admin: {
            width: '40%',
            description: label(
              'Up to two. They cross every type: documentaries above all.',
              'Hasta dos. Valen para cualquier tipo, sobre todo para documentales.',
            ),
          },
        },
        {
          name: 'allAudiences',
          label: label('For all audiences', 'Para todos los públicos'),
          type: 'checkbox',
          defaultValue: false,
          admin: {
            width: '20%',
            description: label(
              'Nothing in it is unsuitable for children.',
              'No tiene nada inadecuado para menores.',
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
      name: 'awards',
      label: label('Awards', 'Premios'),
      labels: { singular: label('Award', 'Premio'), plural: label('Awards', 'Premios') },
      type: 'array',
      admin: {
        description: label(
          'Only awards and nominations a source states, with that source. The year is the ceremony year.',
          'Solo premios y nominaciones que afirme una fuente, con esa fuente. El año es el de la ceremonia.',
        ),
      },
      fields: [
        {
          name: 'name',
          label: label('Award', 'Premio'),
          type: 'text',
          required: true,
          localized: true,
          admin: {
            description: label(
              'E.g. «Goya al mejor cortometraje de animación».',
              'Por ejemplo, «Goya al mejor cortometraje de animación».',
            ),
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'result',
              label: label('Result', 'Resultado'),
              type: 'select',
              required: true,
              defaultValue: 'won',
              options: options({
                won: label('Won', 'Ganador'),
                nominated: label('Nominated', 'Nominado'),
                selected: label('Official selection', 'Selección oficial'),
                shortlisted: label('Shortlisted', 'Preseleccionado'),
              }),
            },
            { name: 'year', label: label('Year', 'Año'), type: 'number', min: 1888, max: 2100 },
          ],
        },
        {
          name: 'source',
          label: label('Source', 'Fuente'),
          type: 'text',
          required: true,
          access: { read: isAuthenticatedField },
          admin: {
            description: label(
              'The page that states it (the awards body, the festival, specialised press).',
              'La página que lo afirma (la academia, el festival, prensa especializada).',
            ),
          },
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
    { ...statusField(['draft', 'review', 'published', 'withdrawn']), validate: officialToPublish },
    {
      type: 'collapsible',
      label: label('Hidden by the embed checker', 'Oculto por la comprobación de embeds'),
      admin: { position: 'sidebar', condition: (data) => Boolean(data?.hiddenReason) },
      fields: [
        {
          name: 'hiddenReason',
          label: label('Reason', 'Motivo'),
          type: 'select',
          access: { read: isAuthenticatedField },
          options: options({
            broken: label('The video no longer exists', 'El vídeo ya no existe'),
            private: label('The video is private', 'El vídeo es privado'),
            'not-embeddable': label('Embedding is disabled', 'Ha desactivado la inserción'),
            'age-restricted': label('Age restricted', 'Restringido por edad'),
          }),
          admin: {
            description: label(
              'Set by the nightly embed checker, which withdrew the short. Clear it and publish again once a source plays.',
              'Lo fija la comprobación nocturna, que retiró el corto. Bórralo y vuelve a publicarlo cuando una fuente se reproduzca.',
            ),
          },
        },
        {
          name: 'hiddenAt',
          label: label('Hidden on', 'Oculto el'),
          type: 'date',
          access: { read: isAuthenticatedField },
        },
      ],
    },
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
      name: 'still',
      label: label('Still', 'Fotograma'),
      type: 'upload',
      relationTo: 'stills',
      admin: {
        position: 'sidebar',
        description: label(
          'The still the site shows behind the short. The nightly checker keeps a provider thumbnail here; one supplied by the author is never replaced.',
          'El fotograma que la web muestra del corto. La comprobación nocturna guarda aquí la miniatura del proveedor; uno aportado por el autor nunca se sustituye.',
        ),
      },
    },
    {
      name: 'tmdbId',
      label: label('TMDB ID', 'ID de TMDB'),
      type: 'number',
      admin: {
        position: 'sidebar',
        description: label(
          'The film on The Movie Database, when it is there.',
          'La película en The Movie Database, si está.',
        ),
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
    {
      name: 'ingestChannel',
      label: label('Scanned channel', 'Canal de búsqueda'),
      type: 'relationship',
      relationTo: 'channels',
      index: true,
      access: { read: isAuthenticatedField },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: label(
          'Set when the channel scan added it, so the review queue can be filtered by channel.',
          'Se fija cuando la búsqueda de un canal lo añade, para poder filtrar la cola de revisión por canal.',
        ),
      },
    },
    aiReviewField,
    importKeyField(),
  ],
  hooks: {
    beforeChange: [
      // A changed slug keeps the old one, so links to it redirect instead of breaking.
      ({ data, originalDoc }) => {
        const before = originalDoc?.slug
        if (typeof before === 'string' && typeof data.slug === 'string' && data.slug !== before) {
          const kept = (originalDoc?.previousSlugs ?? []) as string[]
          data.previousSlugs = [...new Set([...kept, before])].filter((slug) => slug !== data.slug)
        }
        return data
      },
      ({ data, originalDoc }) => {
        const publishing = data.status === 'published' && originalDoc?.status !== 'published'
        if (publishing) {
          data.hiddenReason = null
          data.hiddenAt = null
        }
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
    // Viewers' list, ratings and viewings of a deleted short go with it, before the short itself.
    beforeDelete: [
      async ({ id, req }) => {
        for (const collection of ['list-items', 'ratings', 'viewings'] as const)
          await req.payload.delete({
            collection,
            where: { short: { equals: id } },
            overrideAccess: true,
            req,
          })
      },
    ],
    afterDelete: [({ doc, req }) => queueIndexShort(req, doc.id)],
  },
}
