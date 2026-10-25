import type { CollectionConfig } from 'payload'
import { isAuthenticated, isAuthenticatedField } from '../access.ts'

export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  admin: { useAsTitle: 'name', group: 'Sponsorship' },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true, admin: { description: 'As credited publicly.' } },
    { name: 'website', type: 'text' },
    {
      name: 'notes',
      type: 'textarea',
      access: { read: isAuthenticatedField },
      admin: { description: 'Internal. Never shown publicly.' },
    },
  ],
}
