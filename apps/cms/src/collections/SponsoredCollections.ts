import { ValidationError, type CollectionConfig } from 'payload'
import { isAdmin, publishedOrAuthenticated } from '../access.ts'
import { slugField } from '../fields/slug.ts'
import { statusField } from '../fields/status.ts'
import { common, groups, inLanguage, label, messages } from '../labels.ts'
import { brandedShorts, nonCommercialShorts } from './Collections.ts'
import { slugFreeAcross } from './sharedSlugs.ts'

type Relation = number | { id: number }

const idOf = (value: Relation) => (typeof value === 'object' ? value.id : value)

/**
 * A collection a sponsor presents: its own title and description, the shorts chosen by hand, and
 * the sponsor (its logo goes on the page, «Presentada por»). Never a short under a non-commercial
 * license or made for a brand. Its address is shared with FENAKI's collections (`/es/colecciones/`).
 */
export const SponsoredCollections: CollectionConfig = {
  slug: 'sponsored-collections',
  labels: {
    singular: label('Sponsored collection', 'Colección patrocinada'),
    plural: label('Sponsored collections', 'Colecciones patrocinadas'),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'sponsor', 'sponsorshipStartsAt', 'sponsorshipEndsAt', 'status'],
    group: groups.sponsorship,
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
      name: 'sponsor',
      label: label('Sponsor', 'Patrocinador'),
      type: 'relationship',
      relationTo: 'sponsors',
      required: true,
      admin: {
        description: label(
          'Its name and logo are credited on the collection («Presentada por»).',
          'Su nombre y su logo aparecen en la colección («Presentada por»).',
        ),
      },
    },
    {
      type: 'row',
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
    {
      name: 'shorts',
      label: label('Shorts', 'Cortos'),
      type: 'relationship',
      relationTo: 'shorts',
      hasMany: true,
      required: true,
      admin: {
        description: label(
          'In display order. Shorts under a non-commercial license and branded content cannot be here.',
          'En el orden en que se muestran. No pueden estar los cortos con licencia no comercial ni el contenido de marca.',
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
          'Shown as the hero on the home page while the sponsorship lasts.',
          'Se muestra como cabecera en la portada mientras dura el patrocinio.',
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
  ],
  hooks: {
    beforeValidate: [
      slugFreeAcross('collections'),
      async ({ data, req }) => {
        if (!Array.isArray(data?.shorts)) return data
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
        if (errors.length > 0)
          throw new ValidationError({ collection: 'sponsored-collections', errors })
        return data
      },
    ],
  },
}
