import { ValidationError, type CollectionConfig, type Payload, type PayloadRequest } from 'payload'
import { isAdmin, publishedOrAuthenticated } from '../access.ts'
import { slugField } from '../fields/slug.ts'
import { statusField } from '../fields/status.ts'
import { common, groups, inLanguage, label, messages, options } from '../labels.ts'
import { brandedShorts, nonCommercialShorts } from './Collections.ts'

type Relation = number | { id: number }

const idOf = (value: Relation) => (typeof value === 'object' ? value.id : value)

export const SHOWCASE_KINDS = ['festival', 'school', 'institution'] as const

/** Titles of the shorts with no source on a channel recorded as official. */
export async function unofficialShorts(
  payload: Payload,
  shortIds: number[],
  req?: PayloadRequest,
): Promise<string[]> {
  if (shortIds.length === 0) return []
  const official = await payload.find({
    collection: 'sources',
    where: {
      short: { in: shortIds },
      'channel.name': { exists: true, not_equals: '' },
      officialEvidence: { exists: true, not_equals: '' },
    },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  const covered = new Set(official.docs.map((s) => idOf(s.short as Relation)))
  const missing = shortIds.filter((id) => !covered.has(id))
  if (missing.length === 0) return []
  const shorts = await payload.find({
    collection: 'shorts',
    where: { id: { in: missing } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  return shorts.docs.map((s) => s.title)
}

/**
 * The page an organization (festival, film school, institution) buys: its identity and its own
 * selection of shorts, at /es/escaparates/<slug>. Sponsorship stays on this page, never on a
 * short's page or near the player.
 */
export const Showcases: CollectionConfig = {
  slug: 'showcases',
  labels: { singular: label('Showcase', 'Escaparate'), plural: label('Showcases', 'Escaparates') },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'status'],
    group: groups.sponsorship,
  },
  access: {
    read: publishedOrAuthenticated,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      label: label('Organization', 'Organización'),
      type: 'text',
      required: true,
      admin: { description: label('As it presents itself.', 'Tal como se presenta.') },
    },
    slugField('name'),
    {
      type: 'row',
      fields: [
        {
          name: 'kind',
          label: label('Kind', 'Tipo'),
          type: 'select',
          required: true,
          options: options({
            festival: label('Festival', 'Festival'),
            school: label('Film school', 'Escuela de cine'),
            institution: label('Institution', 'Institución'),
          }),
        },
        {
          name: 'website',
          label: label('Website', 'Sitio web'),
          type: 'text',
          validate: (value: string | null | undefined) =>
            !value || /^https:\/\/\S+$/.test(value) || 'https://…',
        },
      ],
    },
    {
      name: 'logo',
      label: label('Logo', 'Logo'),
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'intro',
      label: label('Short text', 'Texto breve'),
      type: 'textarea',
      localized: true,
      admin: {
        description: label(
          'Two or three sentences about the organization and its selection.',
          'Dos o tres frases sobre la organización y su selección.',
        ),
      },
    },
    {
      name: 'shorts',
      label: label('Selection', 'Selección'),
      type: 'relationship',
      relationTo: 'shorts',
      hasMany: true,
      admin: {
        description: label(
          'In display order. Only shorts on official channels; never non-commercial (NC) ones.',
          'En el orden en que se muestran. Solo cortos en canales oficiales; nunca con licencia no comercial (NC).',
        ),
      },
    },
    {
      name: 'offCircuitConfirmed',
      label: label(
        'None of these shorts is still on the festival circuit',
        'Ninguno de estos cortos sigue en el circuito de festivales',
      ),
      type: 'checkbox',
      defaultValue: false,
      admin: {
        condition: (data) => data?.kind === 'festival',
        description: label(
          'Festivals show past editions or awards only. Tick it once you have checked every short; it is required to publish.',
          'Los festivales solo muestran ediciones pasadas o palmarés. Márcalo cuando hayas comprobado cada corto; hace falta para publicar.',
        ),
      },
    },
    {
      name: 'presentedBy',
      label: label('Presented by', 'Presentado por'),
      type: 'relationship',
      relationTo: 'sponsors',
      admin: {
        description: label(
          'Optional credit in the page header. Branded shorts cannot be in a presented showcase.',
          'Crédito opcional en la cabecera de la página. Un escaparate presentado no puede incluir contenido de marca.',
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
      async ({ data, req }) => {
        if (!data) return data
        const ids = Array.isArray(data.shorts) ? (data.shorts as Relation[]).map(idOf) : []
        const language = req.i18n?.language
        // In sequence: the queries share the request's transaction.
        const unofficial = await unofficialShorts(req.payload, ids, req)
        const nonCommercial = await nonCommercialShorts(req.payload, ids, req)
        const branded = data.presentedBy ? await brandedShorts(req.payload, ids, req) : []
        const errors = [
          { titles: unofficial, message: messages.unofficialInShowcase },
          { titles: nonCommercial, message: messages.nonCommercialInShowcase },
          { titles: branded, message: messages.brandedInSponsored },
        ]
          .filter(({ titles }) => titles.length > 0)
          .map(({ titles, message }) => ({
            path: 'shorts',
            message: `${inLanguage(message, language)} ${titles.join(', ')}`,
          }))
        if (data.kind === 'festival' && data.status === 'published' && !data.offCircuitConfirmed)
          errors.push({
            path: 'offCircuitConfirmed',
            message: inLanguage(messages.offCircuitRequired, language),
          })
        if (errors.length > 0) throw new ValidationError({ collection: 'showcases', errors })
        return data
      },
    ],
  },
}
