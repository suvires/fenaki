import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access.ts'
import { common, groups, label } from '../labels.ts'

/** Signed license agreements. Private: never readable through the public API. */
export const LicenseDocuments: CollectionConfig = {
  slug: 'license-documents',
  labels: {
    singular: label('License document', 'Documento de licencia'),
    plural: label('License documents', 'Documentos de licencia'),
  },
  admin: { group: groups.rights },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  upload: { staticDir: 'documents', mimeTypes: ['application/pdf'] },
  fields: [{ name: 'title', label: common.title, type: 'text', required: true }],
}
