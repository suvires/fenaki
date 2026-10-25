import { ValidationError, type CollectionConfig, type Payload, type PayloadRequest } from 'payload'
import { publishedOrAuthenticated } from '../access.ts'
import { slugField } from '../fields/slug.ts'
import { statusField } from '../fields/status.ts'
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

export const Collections: CollectionConfig = {
  slug: 'collections',
  labels: { singular: 'Collection', plural: 'Collections' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'featured', 'sponsor', 'status'],
    group: 'Catalog',
  },
  access: { read: publishedOrAuthenticated },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField('title', { localized: true }),
    { name: 'description', type: 'textarea', localized: true },
    {
      name: 'shorts',
      type: 'relationship',
      relationTo: 'shorts',
      hasMany: true,
      admin: { description: 'In display order. Drag to reorder.' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'Shown as the hero on the home page.' },
    },
    statusField(),
    {
      type: 'collapsible',
      label: 'Sponsorship',
      fields: [
        {
          name: 'sponsor',
          type: 'relationship',
          relationTo: 'sponsors',
          admin: {
            description:
              'Shorts under a non-commercial license cannot be in a sponsored collection.',
          },
        },
        {
          type: 'row',
          admin: { condition: (data) => Boolean(data?.sponsor) },
          fields: [
            { name: 'sponsorshipStartsAt', type: 'date' },
            { name: 'sponsorshipEndsAt', type: 'date' },
          ],
        },
      ],
    },
    {
      name: 'sample',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Sample data for development.' },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data?.sponsor || !Array.isArray(data.shorts)) return data
        const blocked = await nonCommercialShorts(
          req.payload,
          (data.shorts as Relation[]).map(idOf),
          req,
        )
        if (blocked.length > 0) {
          throw new ValidationError({
            collection: 'collections',
            errors: [
              {
                path: 'shorts',
                message: `A sponsored collection cannot include non-commercial (NC) shorts: ${blocked.join(', ')}`,
              },
            ],
          })
        }
        return data
      },
    ],
  },
}
