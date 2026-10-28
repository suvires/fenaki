import type { CollectionConfig, Payload, PayloadRequest } from 'payload'
import { isAdmin, publishedOrAuthenticated } from '../access.ts'
import { importKeyField } from '../fields/importKey.ts'
import { slugField } from '../fields/slug.ts'
import { statusField } from '../fields/status.ts'
import { common, groups, label, options } from '../labels.ts'
import { GENRE_LABELS, THEME_LABELS } from '../catalog/taxonomy.ts'
import { CHANNEL_KIND_LABELS } from './Sources.ts'
import { slugFreeAcross } from './sharedSlugs.ts'
import { collectionPreviewEndpoint, collectionShortsEndpoint } from './collectionEndpoints.ts'
import { isNonCommercial } from './Licenses.ts'

type Relation = number | { id: number }

const idOf = (value: Relation) => (typeof value === 'object' ? value.id : value)

/** Titles of the shorts that play under a non-commercial license. */
export async function nonCommercialShorts(
  payload: Payload,
  shortIds: number[],
  req?: PayloadRequest,
): Promise<string[]> {
  if (shortIds.length === 0) return []
  const sources = await payload.find({
    collection: 'sources',
    where: { short: { in: shortIds } },
    depth: 1,
    limit: 0,
    pagination: false,
    req,
  })
  const flagged = new Set(
    sources.docs
      .filter((s) => typeof s.license === 'object' && isNonCommercial(s.license.type))
      .map((s) => idOf(s.short as Relation)),
  )
  if (flagged.size === 0) return []
  const shorts = await payload.find({
    collection: 'shorts',
    where: { id: { in: [...flagged] } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  return shorts.docs.map((s) => s.title)
}

/** Titles of the branded shorts: made by or for a brand, so never part of a sponsored collection. */
export async function brandedShorts(
  payload: Payload,
  shortIds: number[],
  req?: PayloadRequest,
): Promise<string[]> {
  if (shortIds.length === 0) return []
  const shorts = await payload.find({
    collection: 'shorts',
    where: { id: { in: shortIds }, brandedContent: { equals: true } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  return shorts.docs.map((s) => s.title)
}

/** How a collection picks its shorts: a list chosen by hand, or filters over the catalog. */
export const COLLECTION_MODES = ['rules', 'manual'] as const
/** The order of a collection by filters: newest first, by year, or a mix that changes daily. */
export const COLLECTION_SORTS = ['newest', 'year', 'daily'] as const
/** Regions a collection can filter by, as groups of countries (see collections/regions.ts). */
export const REGIONS = ['latin-america', 'spain', 'europe'] as const

const byRules = (data: Record<string, unknown> | undefined) => data?.mode !== 'manual'
const byHand = (data: Record<string, unknown> | undefined) => data?.mode === 'manual'

/**
 * FENAKI's own collections: rails on the home page and a page each. By filters (they grow as the
 * catalog does) or chosen by hand. Sponsored collections are a collection of their own
 * (SponsoredCollections.ts): always by hand, with their sponsor.
 */
export const Collections: CollectionConfig = {
  slug: 'collections',
  labels: {
    singular: label('Collection', 'Colección'),
    plural: label('Collections', 'Colecciones'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'mode', 'featured', 'status'],
    group: groups.catalog,
  },
  access: {
    read: publishedOrAuthenticated,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: [collectionPreviewEndpoint, collectionShortsEndpoint],
  fields: [
    { name: 'title', label: common.title, type: 'text', required: true, localized: true },
    slugField('title', { localized: true }),
    {
      name: 'description',
      label: label('Description', 'Descripción'),
      type: 'textarea',
      localized: true,
    },
    {
      name: 'mode',
      label: label('Shorts', 'Cortos'),
      type: 'select',
      required: true,
      defaultValue: 'rules',
      options: options({
        rules: label('By filters', 'Por filtros'),
        manual: label('Chosen by hand', 'Elegidos a mano'),
      }),
      admin: {
        description: label(
          'By filters, the collection grows on its own as shorts that match are published.',
          'Por filtros, la colección crece sola cuando se publican cortos que los cumplen.',
        ),
      },
    },
    {
      name: 'shorts',
      label: label('Shorts', 'Cortos'),
      type: 'relationship',
      relationTo: 'shorts',
      hasMany: true,
      admin: {
        condition: byHand,
        description: label(
          'In display order. Drag to reorder.',
          'En el orden en que se muestran. Arrastra para reordenar.',
        ),
      },
    },
    {
      name: 'rules',
      label: label('Filters', 'Filtros'),
      type: 'group',
      admin: {
        condition: byRules,
        description: label(
          'A short enters when it meets every filter set; an empty filter does not count.',
          'Entra un corto cuando cumple todos los filtros puestos; un filtro vacío no cuenta.',
        ),
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'types',
              label: label('Types', 'Tipos'),
              type: 'select',
              hasMany: true,
              options: options({
                fiction: label('Fiction', 'Ficción'),
                documentary: label('Documentary', 'Documental'),
                animation: label('Animation', 'Animación'),
                experimental: label('Experimental', 'Experimental'),
              }),
              admin: { width: '33%' },
            },
            {
              name: 'genres',
              label: label('Genres', 'Géneros'),
              type: 'select',
              hasMany: true,
              options: options(GENRE_LABELS),
              admin: { width: '33%' },
            },
            {
              name: 'themes',
              label: label('Themes', 'Temas'),
              type: 'select',
              hasMany: true,
              options: options(THEME_LABELS),
              admin: { width: '33%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'region',
              label: label('Region', 'Región'),
              type: 'select',
              options: options({
                'latin-america': label('Latin America', 'Latinoamérica'),
                spain: label('Spain', 'España'),
                europe: label('Europe', 'Europa'),
              }),
              admin: { width: '33%' },
            },
            {
              name: 'countries',
              label: label('Countries', 'Países'),
              type: 'text',
              hasMany: true,
              admin: {
                width: '33%',
                description: label(
                  'Two-letter codes (AR, MX…), besides the region.',
                  'Códigos de dos letras (AR, MX…), además de la región.',
                ),
              },
            },
            {
              name: 'channelKinds',
              label: label('Published by', 'Publicado por'),
              type: 'select',
              hasMany: true,
              options: options(CHANNEL_KIND_LABELS),
              admin: { width: '33%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'minMinutes',
              label: label('From (min)', 'Desde (min)'),
              type: 'number',
              min: 0,
              admin: { width: '25%' },
            },
            {
              name: 'maxMinutes',
              label: label('Up to (min)', 'Hasta (min)'),
              type: 'number',
              min: 1,
              admin: { width: '25%' },
            },
            {
              name: 'yearFrom',
              label: label('From year', 'Desde el año'),
              type: 'number',
              min: 1888,
              max: 2100,
              admin: { width: '25%' },
            },
            {
              name: 'yearTo',
              label: label('Up to year', 'Hasta el año'),
              type: 'number',
              min: 1888,
              max: 2100,
              admin: { width: '25%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'originalLanguage',
              label: label('Original language', 'Idioma original'),
              type: 'text',
              admin: {
                width: '25%',
                description: label('Two-letter code (es, en…).', 'Código de dos letras (es, en…).'),
              },
            },
            {
              name: 'spanishSubtitles',
              label: label('Spanish subtitles', 'Subtítulos en español'),
              type: 'checkbox',
              admin: { width: '25%' },
            },
            {
              name: 'noDialogue',
              label: label('No dialogue', 'Sin diálogos'),
              type: 'checkbox',
              admin: { width: '25%' },
            },
            {
              name: 'allAudiences',
              label: label('For all audiences', 'Para todos los públicos'),
              type: 'checkbox',
              admin: { width: '25%' },
            },
          ],
        },
        {
          name: 'withAwards',
          label: label('With awards or festival selections', 'Con premios o festivales'),
          type: 'checkbox',
        },
      ],
    },
    {
      type: 'row',
      admin: { condition: byRules },
      fields: [
        {
          name: 'sort',
          label: label('Order', 'Orden'),
          type: 'select',
          required: true,
          defaultValue: 'newest',
          options: options({
            newest: label('Newest first', 'Más recientes primero'),
            year: label('By year, newest first', 'Por año, del más reciente'),
            daily: label('A mix that changes daily', 'Una mezcla que cambia cada día'),
          }),
          admin: { width: '50%' },
        },
        {
          name: 'railSize',
          label: label('Shorts in the home rail', 'Cortos en la fila de la portada'),
          type: 'number',
          required: true,
          defaultValue: 12,
          min: 4,
          max: 24,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'pinned',
      label: label('Always first', 'Siempre primero'),
      type: 'relationship',
      relationTo: 'shorts',
      hasMany: true,
      admin: {
        condition: byRules,
        description: label(
          'Shown first, in this order, whether or not they meet the filters.',
          'Salen primero, en este orden, cumplan o no los filtros.',
        ),
      },
    },
    {
      name: 'excluded',
      label: label('Never in it', 'Nunca en ella'),
      type: 'relationship',
      relationTo: 'shorts',
      hasMany: true,
      admin: { condition: byRules },
    },
    {
      name: 'preview',
      type: 'ui',
      admin: {
        condition: byRules,
        components: { Field: '/admin/CollectionPreview.tsx#CollectionPreview' },
      },
    },
    {
      name: 'featured',
      label: label('Featured', 'Destacada'),
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: label(
          'Shown as the hero on the home page, unless a sponsored collection in its dates is.',
          'Se muestra como cabecera en la portada, salvo que lo sea una patrocinada en sus fechas.',
        ),
      },
    },
    statusField(),
    {
      name: 'sample',
      label: common.sample,
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: common.sampleHelp },
    },
    importKeyField(),
  ],
  hooks: {
    beforeValidate: [slugFreeAcross('sponsored-collections')],
  },
}
