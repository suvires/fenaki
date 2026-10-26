import type { CollectionConfig } from 'payload'
import { isMember, ownRows, ownRowsOrAdmin } from '../access.ts'
import { MAX_LIST_ITEMS } from '../accounts/rules.ts'
import { memberField, oneRowPerMemberAndShort, ownedRow, shortField } from '../accounts/owned.ts'
import { groups, label } from '../labels.ts'

/** «Mi lista»: the shorts a member saved. */
export const ListItems: CollectionConfig = {
  slug: 'list-items',
  labels: {
    singular: label('My list item', 'Elemento de Mi lista'),
    plural: label('My list items', 'Elementos de Mi lista'),
  },
  admin: {
    group: groups.viewers,
    defaultColumns: ['member', 'short', 'savedAt'],
    // Personal data: shown to admins for support and GDPR requests, never edited by hand.
    description: label(
      'Personal data of viewers. Read only.',
      'Datos personales de los espectadores. Solo lectura.',
    ),
  },
  indexes: oneRowPerMemberAndShort,
  access: {
    read: ownRowsOrAdmin,
    create: isMember,
    // Saving a short again moves it to the top: the member updates `savedAt`.
    update: ownRows,
    delete: ownRowsOrAdmin,
  },
  hooks: { beforeValidate: [ownedRow('list-items', MAX_LIST_ITEMS)] },
  fields: [
    memberField,
    shortField,
    {
      name: 'savedAt',
      label: label('Saved at', 'Guardado el'),
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
  ],
}
