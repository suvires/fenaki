import type { CollectionConfig } from 'payload'
import { isMember, ownRows, ownRowsOrAdmin } from '../access.ts'
import { MAX_RATINGS } from '../accounts/rules.ts'
import { memberField, oneRowPerMemberAndShort, ownedRow, shortField } from '../accounts/owned.ts'
import { groups, label, options } from '../labels.ts'

export const RATING_VALUES = ['dislike', 'like', 'love'] as const

/** How a member rated a short. */
export const Ratings: CollectionConfig = {
  slug: 'ratings',
  labels: { singular: label('Rating', 'Valoración'), plural: label('Ratings', 'Valoraciones') },
  admin: {
    group: groups.viewers,
    defaultColumns: ['member', 'short', 'value'],
    description: label(
      'Personal data of viewers. Read only.',
      'Datos personales de los espectadores. Solo lectura.',
    ),
  },
  indexes: oneRowPerMemberAndShort,
  access: {
    read: ownRowsOrAdmin,
    create: isMember,
    update: ownRows,
    delete: ownRowsOrAdmin,
  },
  hooks: { beforeValidate: [ownedRow('ratings', MAX_RATINGS)] },
  fields: [
    memberField,
    shortField,
    {
      name: 'value',
      label: label('Rating', 'Valoración'),
      type: 'select',
      required: true,
      options: options({
        dislike: label('Not for me', 'No es para mí'),
        like: label('Like', 'Me gusta'),
        love: label('Love', 'Me encanta'),
      }),
    },
  ],
}
