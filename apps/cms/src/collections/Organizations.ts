import type { CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '../access.ts'
import { ORGANIZATION_TYPES, PIPELINE, PRIORITIES, PRODUCTS } from '../crm/constants.ts'
import { groups, label, options } from '../labels.ts'

/** The festivals, schools, brands and institutions the outreach is aimed at. Never public. */
export const Organizations: CollectionConfig = {
  slug: 'organizations',
  labels: {
    singular: label('Organization', 'Organización'),
    plural: label('Organizations', 'Organizaciones'),
  },
  admin: {
    useAsTitle: 'name',
    group: groups.sales,
    defaultColumns: ['name', 'type', 'priority', 'status', 'nextFollowUpDate'],
    listSearchableFields: ['name', 'city', 'website'],
  },
  access: { read: isStaff, create: isStaff, update: isStaff, delete: isAdmin },
  fields: [
    { name: 'name', label: label('Name', 'Nombre'), type: 'text', required: true, index: true },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          label: label('Type', 'Tipo'),
          type: 'select',
          required: true,
          defaultValue: 'other',
          options: options(ORGANIZATION_TYPES),
        },
        {
          name: 'priority',
          label: label('Priority', 'Prioridad'),
          type: 'select',
          defaultValue: 'B',
          index: true,
          options: options(PRIORITIES),
        },
        {
          name: 'status',
          label: label('Pipeline status', 'Estado del embudo'),
          type: 'select',
          required: true,
          defaultValue: 'to_contact',
          index: true,
          options: options(PIPELINE),
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'country', label: label('Country', 'País'), type: 'text' },
        { name: 'city', label: label('City', 'Ciudad'), type: 'text' },
        { name: 'website', label: label('Website', 'Sitio web'), type: 'text' },
      ],
    },
    {
      name: 'proposalsChannel',
      label: label('Proposals channel', 'Canal de propuestas'),
      type: 'text',
      admin: {
        description: label(
          'URL or address where they publish that they accept proposals.',
          'URL o dirección donde publican que aceptan propuestas.',
        ),
      },
    },
    {
      name: 'nextEdition',
      label: label('Next edition', 'Próxima edición'),
      type: 'text',
    },
    { name: 'whyFits', label: label('Why it fits', 'Por qué encaja'), type: 'textarea' },
    {
      name: 'recommendedProduct',
      label: label('Recommended product', 'Producto recomendado'),
      type: 'select',
      options: options(PRODUCTS),
    },
    { name: 'source', label: label('Source', 'Fuente'), type: 'text' },
    { name: 'notes', label: label('Notes', 'Notas'), type: 'textarea' },
    {
      type: 'row',
      fields: [
        {
          name: 'lastContactDate',
          label: label('Last contact', 'Último contacto'),
          type: 'date',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'nextFollowUpDate',
          label: label('Next follow-up', 'Próximo seguimiento'),
          type: 'date',
          index: true,
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    {
      name: 'sponsor',
      label: label('Sponsor record', 'Ficha de patrocinador'),
      type: 'relationship',
      relationTo: 'sponsors',
      admin: {
        position: 'sidebar',
        description: label(
          'Link the sponsor when this organization buys.',
          'Enlaza el patrocinador cuando esta organización compre.',
        ),
      },
    },
  ],
}
