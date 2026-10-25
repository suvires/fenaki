import type { SelectField } from 'payload'
import { common, label, options, type AdminLabel } from '../labels.ts'

const STATUSES = {
  draft: label('Draft', 'Borrador'),
  published: label('Published', 'Publicado'),
  withdrawn: label('Withdrawn', 'Retirado'),
} satisfies Record<string, AdminLabel>

export function statusField(
  values: (keyof typeof STATUSES)[] = ['draft', 'published'],
): SelectField {
  return {
    name: 'status',
    label: common.status,
    type: 'select',
    required: true,
    defaultValue: 'draft',
    index: true,
    options: options(Object.fromEntries(values.map((v) => [v, STATUSES[v]]))),
    admin: { position: 'sidebar' },
  }
}
