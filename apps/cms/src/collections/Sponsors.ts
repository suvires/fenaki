import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticatedField } from '../access.ts'
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
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
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
      name: 'logo',
      label: label('Logo', 'Logo'),
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: label(
          'Optional. Shown on its sponsored collections and showcases, in place of the name.',
          'Opcional. Aparece en sus colecciones patrocinadas y salas, en lugar del nombre.',
        ),
      },
    },
    {
      name: 'notes',
      label: common.notes,
      type: 'textarea',
      access: { read: isAuthenticatedField },
      admin: { description: common.notesHelp },
    },
  ],
}
