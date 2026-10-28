import type { CollectionConfig } from 'payload'
import { isAdmin, ownRowsOrAdmin } from '../access.ts'
import { memberField } from '../accounts/owned.ts'
import type { ChannelKind } from '../collections/Sources.ts'
import { groups, label, options, type AdminLabel } from '../labels.ts'
import { notifyRejected } from './notify.ts'
import { submissionEndpoints } from './submit.ts'

export const SUBMISSION_STATUSES = ['in-review', 'approved', 'rejected'] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

/**
 * «Sube tu corto»: a member proposes a short on YouTube or Vimeo, declaring the channel is theirs
 * or the official one. The short is created waiting for review, and approving it is publishing it.
 * Members only reach their own submissions, and only through the endpoints in submit.ts.
 */
export const Submissions: CollectionConfig = {
  slug: 'submissions',
  labels: {
    singular: label('Submission', 'Envío'),
    plural: label('Submissions', 'Envíos'),
  },
  admin: {
    group: groups.catalog,
    useAsTitle: 'videoTitle',
    defaultColumns: ['videoTitle', 'status', 'relation', 'member', 'createdAt'],
    description: label(
      'Shorts proposed by viewers from «Sube tu corto». Check the channel is official before publishing the short: publishing approves its submission, rejecting one emails the reason to its sender.',
      'Cortos propuestos por espectadores desde «Sube tu corto». Comprueba que el canal es el oficial antes de publicar el corto: publicarlo aprueba su envío y al rechazar uno se envía el motivo por email.',
    ),
  },
  access: {
    read: ownRowsOrAdmin,
    // Created and verified through the endpoints; an admin reviews and rejects here.
    create: () => false,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: { afterChange: [notifyRejected] },
  endpoints: submissionEndpoints,
  fields: [
    memberField,
    {
      name: 'videoTitle',
      label: label('Video title', 'Título del vídeo'),
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'url',
      label: label('Video URL', 'URL del vídeo'),
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          label: label('Provider', 'Plataforma'),
          type: 'select',
          required: true,
          options: options({
            youtube: label('YouTube', 'YouTube'),
            vimeo: label('Vimeo', 'Vimeo'),
          }),
          admin: { readOnly: true },
        },
        {
          name: 'externalId',
          label: label('Video ID', 'ID del vídeo'),
          type: 'text',
          required: true,
          index: true,
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'relation',
      label: label('Who sends it', 'Quién lo envía'),
      type: 'select',
      required: true,
      options: options({
        author: label('Its author', 'Su autor o autora'),
        producer: label('Its producer', 'La productora'),
        distributor: label('Its distributor', 'La distribuidora'),
        festival: label('A festival', 'Un festival'),
        school: label('A film school', 'Una escuela de cine'),
        institution: label('An institution', 'Una institución'),
      } satisfies Record<ChannelKind, AdminLabel>),
      admin: { readOnly: true },
    },
    {
      name: 'status',
      label: label('Status', 'Estado'),
      type: 'select',
      required: true,
      defaultValue: 'in-review',
      index: true,
      options: options({
        'in-review': label('In review', 'En revisión'),
        approved: label('Approved', 'Aprobado'),
        rejected: label('Rejected', 'Rechazado'),
      } satisfies Record<SubmissionStatus, AdminLabel>),
      admin: { position: 'sidebar' },
    },
    {
      name: 'reason',
      label: label('Reason for rejecting', 'Motivo del rechazo'),
      type: 'textarea',
      maxLength: 1000,
      admin: {
        position: 'sidebar',
        condition: (data) => data?.status === 'rejected',
        description: label(
          'Sent to the sender, in Spanish. Save with the status «Rejected».',
          'Se envía a quien lo envió. Guarda con el estado «Rechazado».',
        ),
      },
      validate: (value: unknown, { siblingData }: { siblingData: { status?: string } }) =>
        siblingData.status !== 'rejected' ||
        (typeof value === 'string' && value.trim() !== '') ||
        'Escribe el motivo: se envía a quien lo envió.',
    },
    {
      name: 'short',
      label: label('Short', 'Corto'),
      type: 'relationship',
      relationTo: 'shorts',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'acceptedTermsAt',
      label: label('Accepted the terms on', 'Aceptó las condiciones el'),
      type: 'date',
      required: true,
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'notifiedAt',
      label: label('Sender notified on', 'Avisado el'),
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
