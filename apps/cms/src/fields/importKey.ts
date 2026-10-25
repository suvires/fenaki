import type { TextField } from 'payload'
import { isAuthenticatedField } from '../access.ts'
import { common } from '../labels.ts'

/**
 * The stable key a document has in the catalog import file. Re-running the import finds documents
 * by this key, so it updates them instead of creating duplicates, even after a slug changes.
 */
export function importKeyField(): TextField {
  return {
    name: 'importKey',
    label: common.importKey,
    type: 'text',
    unique: true,
    index: true,
    access: { read: isAuthenticatedField },
    admin: { position: 'sidebar', readOnly: true, description: common.importKeyHelp },
  }
}
