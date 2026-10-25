import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access.ts'

/** Signed license agreements. Private: never readable through the public API. */
export const LicenseDocuments: CollectionConfig = {
  slug: 'license-documents',
  admin: { group: 'Rights' },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  upload: { staticDir: 'documents', mimeTypes: ['application/pdf'] },
  fields: [{ name: 'title', type: 'text', required: true }],
}
