import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { isMember, ownRows, ownRowsOrAdmin } from '../access.ts'
import { COMPLETED_FROM, MAX_VIEWINGS } from '../accounts/rules.ts'
import { memberField, oneRowPerMemberAndShort, ownedRow, shortField } from '../accounts/owned.ts'
import { groups, label } from '../labels.ts'

/** Whether a viewing counts as finished: from 90 % of the duration. */
export function isCompleted(position: number, duration: number): boolean {
  return duration > 0 && position / duration >= COMPLETED_FROM
}

/** Keeps the position within the duration and decides `completed` here, whatever the client says. */
const settleProgress: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  const duration = Number(data.durationSeconds ?? originalDoc?.durationSeconds ?? 0)
  const position = Math.max(0, Number(data.positionSeconds ?? originalDoc?.positionSeconds ?? 0))
  data.positionSeconds = duration > 0 ? Math.min(position, duration) : position
  data.completed = isCompleted(data.positionSeconds, duration)
  return data
}

/**
 * Where a member stopped in each short: «Seguir viendo» (unfinished ones) and the history (all of
 * them). One row per member and short, updated as they watch.
 */
export const Viewings: CollectionConfig = {
  slug: 'viewings',
  labels: { singular: label('Viewing', 'Visionado'), plural: label('Viewings', 'Visionados') },
  admin: {
    group: groups.viewers,
    defaultColumns: ['member', 'short', 'positionSeconds', 'completed', 'updatedAt'],
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
  hooks: { beforeValidate: [ownedRow('viewings', MAX_VIEWINGS), settleProgress] },
  fields: [
    memberField,
    shortField,
    {
      type: 'row',
      fields: [
        {
          name: 'positionSeconds',
          label: label('Position (seconds)', 'Posición (segundos)'),
          type: 'number',
          required: true,
          min: 0,
          defaultValue: 0,
        },
        {
          name: 'durationSeconds',
          label: label('Duration (seconds)', 'Duración (segundos)'),
          type: 'number',
          required: true,
          min: 0,
          defaultValue: 0,
        },
      ],
    },
    {
      name: 'completed',
      label: label('Completed', 'Terminado'),
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: label(
          'Set from 90 % of the duration, by the server.',
          'Lo fija el servidor a partir del 90 % de la duración.',
        ),
      },
    },
  ],
}
