import type { CollectionConfig } from 'payload'
import { isAuthenticated, isAuthenticatedField } from '../access.ts'
import { common, groups, label } from '../labels.ts'

export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  labels: {
    singular: label('Sponsor', 'Patrocinador'),
    plural: label('Sponsors', 'Patrocinadores'),
  },
  admin: { useAsTitle: 'name', group: groups.sponsorship },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: 'name',
      label: common.name,
      type: 'text',
      required: true,
      admin: { description: label('As credited publicly.', 'Tal como aparece en los créditos.') },
    },
    { name: 'website', label: label('Website', 'Sitio web'), type: 'text' },
    {
      name: 'notes',
      label: common.notes,
      type: 'textarea',
      access: { read: isAuthenticatedField },
      admin: { description: common.notesHelp },
    },
  ],
}
