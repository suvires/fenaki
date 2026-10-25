import type { CollectionConfig } from 'payload'
import { isAuthenticated, isAuthenticatedField } from '../access.ts'

export const LICENSE_TYPES = [
  'platform-terms',
  'cc-by',
  'cc-by-sa',
  'cc-by-nd',
  'cc-by-nc',
  'cc-by-nc-sa',
  'cc-by-nc-nd',
  'cc0',
  'public-domain',
  'direct-agreement',
] as const

export type LicenseType = (typeof LICENSE_TYPES)[number]

/** Non-commercial licenses: their shorts can never be part of a sponsored collection. */
export function isNonCommercial(type: string | null | undefined): boolean {
  return typeof type === 'string' && type.startsWith('cc-by-nc')
}

export const Licenses: CollectionConfig = {
  slug: 'licenses',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'route', 'type'], group: 'Rights' },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true, admin: { description: 'Internal name.' } },
    {
      type: 'row',
      fields: [
        {
          name: 'route',
          type: 'select',
          required: true,
          options: [
            { value: 'embed', label: 'Official embed' },
            { value: 'open', label: 'Open license' },
            { value: 'direct', label: 'Direct license' },
          ],
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: LICENSE_TYPES.map((value) => ({ value, label: value })),
        },
      ],
    },
    {
      name: 'attribution',
      type: 'textarea',
      admin: { description: 'The credit the license requires, word for word.' },
    },
    {
      name: 'signedDocument',
      type: 'upload',
      relationTo: 'license-documents',
      access: { read: isAuthenticatedField },
    },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date' },
        { name: 'endsAt', type: 'date' },
      ],
    },
    { name: 'notes', type: 'textarea', access: { read: isAuthenticatedField } },
  ],
}
