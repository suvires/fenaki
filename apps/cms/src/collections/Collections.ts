import { ValidationError, type CollectionConfig, type Payload, type PayloadRequest } from 'payload'
import { isAdmin, publishedOrAuthenticated } from '../access.ts'
import { importKeyField } from '../fields/importKey.ts'
import { slugField } from '../fields/slug.ts'
import { statusField } from '../fields/status.ts'
import { common, groups, inLanguage, label, messages } from '../labels.ts'
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

export const Collections: CollectionConfig = {
  slug: 'collections',
  labels: {
    singular: label('Collection', 'Colección'),
    plural: label('Collections', 'Colecciones'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'featured', 'sponsor', 'status'],
    group: groups.catalog,
  },
  access: {
    read: publishedOrAuthenticated,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
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
      name: 'shorts',
      label: label('Shorts', 'Cortos'),
      type: 'relationship',
      relationTo: 'shorts',
      hasMany: true,
      admin: {
        description: label(
          'In display order. Drag to reorder.',
          'En el orden en que se muestran. Arrastra para reordenar.',
        ),
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
          'Shown as the hero on the home page.',
          'Se muestra como cabecera en la página de inicio.',
        ),
      },
    },
    statusField(),
    {
      type: 'collapsible',
      label: groups.sponsorship,
      fields: [
        {
          name: 'sponsor',
          label: label('Sponsor', 'Patrocinador'),
          type: 'relationship',
          relationTo: 'sponsors',
          admin: {
            description: label(
              'Shorts under a non-commercial license and branded content cannot be in a sponsored collection.',
              'Los cortos con licencia no comercial y el contenido de marca no pueden estar en una colección patrocinada.',
            ),
          },
        },
        {
          type: 'row',
          admin: { condition: (data) => Boolean(data?.sponsor) },
          fields: [
            {
              name: 'sponsorshipStartsAt',
              label: label('Sponsorship starts', 'Inicio del patrocinio'),
              type: 'date',
            },
            {
              name: 'sponsorshipEndsAt',
              label: label('Sponsorship ends', 'Fin del patrocinio'),
              type: 'date',
            },
          ],
        },
      ],
    },
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
    beforeValidate: [
      async ({ data, req }) => {
        if (!data?.sponsor || !Array.isArray(data.shorts)) return data
        const ids = (data.shorts as Relation[]).map(idOf)
        // In sequence: both queries share the request's transaction.
        const nonCommercial = await nonCommercialShorts(req.payload, ids, req)
        const branded = await brandedShorts(req.payload, ids, req)
        const language = req.i18n?.language
        const errors = [
          { titles: nonCommercial, message: messages.nonCommercialInSponsored },
          { titles: branded, message: messages.brandedInSponsored },
        ]
          .filter(({ titles }) => titles.length > 0)
          .map(({ titles, message }) => ({
            path: 'shorts',
            message: `${inLanguage(message, language)} ${titles.join(', ')}`,
          }))
        if (errors.length > 0) throw new ValidationError({ collection: 'collections', errors })
        return data
      },
    ],
  },
}
