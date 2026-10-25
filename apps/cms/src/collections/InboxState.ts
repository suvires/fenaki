import type { GlobalConfig } from 'payload'
import { isStaff } from '../access.ts'
import { groups, label } from '../labels.ts'

/**
 * Where the inbox sync left off. Written only by the jobs worker; nothing here is editable from
 * the panel or the API.
 */
export const InboxState: GlobalConfig = {
  slug: 'crm-inbox',
  label: label('Inbox sync', 'Sincronización del buzón'),
  admin: { group: groups.sales, hidden: true },
  access: { read: isStaff, update: () => false },
  fields: [
    { name: 'uidValidity', type: 'text' },
    { name: 'lastUid', type: 'number' },
    { name: 'lastRunAt', type: 'date' },
    { name: 'lastError', type: 'text' },
  ],
}
