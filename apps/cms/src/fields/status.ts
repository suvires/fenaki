import type { SelectField } from 'payload'

export function statusField(options: string[] = ['draft', 'published']): SelectField {
  return {
    name: 'status',
    type: 'select',
    required: true,
    defaultValue: 'draft',
    index: true,
    options: options.map((value) => ({ value, label: value[0]?.toUpperCase() + value.slice(1) })),
    admin: { position: 'sidebar' },
  }
}
