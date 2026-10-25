import { APIError, type CollectionConfig } from 'payload'
import { isAdmin, isStaff } from '../access.ts'
import { DIRECTIONS, MESSAGE_STATUSES } from '../crm/constants.ts'
import { crmErrors } from '../crm/errors.ts'
import { approveAndSendEndpoint, syncInboxEndpoint } from '../crm/endpoints.ts'
import { checkMessageWrite, idOf, type Actor } from '../crm/messageGate.ts'
import { groups, inLanguage, label, options } from '../labels.ts'

const actorOf = (user: { role?: string | null } | null | undefined): Actor =>
  !user ? 'system' : user.role === 'admin' ? 'admin' : user.role === 'agent' ? 'agent' : 'anonymous'

const protectedField = {
  // Set by the send action and the inbox sync only; the gate discards anything else.
  admin: { readOnly: true, position: 'sidebar' },
} as const

/**
 * Outreach drafts, sent emails and replies. The approval gate lives in `beforeChange` (and in
 * `crm/messageGate.ts`, which is tested): an agent drafts, only an admin approves, and only the
 * send action marks a message as sent.
 */
export const Messages: CollectionConfig = {
  slug: 'messages',
  labels: { singular: label('Message', 'Mensaje'), plural: label('Messages', 'Mensajes') },
  admin: {
    useAsTitle: 'subject',
    group: groups.sales,
    defaultColumns: ['subject', 'direction', 'status', 'organization', 'contact', 'updatedAt'],
    listSearchableFields: ['subject'],
  },
  access: { read: isStaff, create: isStaff, update: isStaff, delete: isAdmin },
  endpoints: [approveAndSendEndpoint, syncInboxEndpoint],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        const language = req.i18n?.language
        const actor = actorOf(req.user)
        const result = checkMessageWrite({
          actor,
          operation,
          original: originalDoc,
          data,
          userId: req.user?.id,
        })
        if (!result.ok) {
          const status = actor === 'anonymous' ? 401 : 403
          throw new APIError(inLanguage(crmErrors[result.error], language), status, undefined, true)
        }
        const next = { ...result.data }
        const merged = { ...(operation === 'update' ? originalDoc : {}), ...next }

        // Every outbound message the system has not sent yet must still be allowed to go out.
        if (actor !== 'system' && merged.direction !== 'inbound') {
          const contactId = idOf(merged.contact)
          if (!contactId)
            throw new APIError(
              inLanguage(crmErrors.contactRequired, language),
              400,
              undefined,
              true,
            )
          const contact = await req.payload.findByID({
            collection: 'contacts',
            id: contactId as number,
            depth: 0,
            overrideAccess: true,
            req,
          })
          if (contact.doNotContact)
            throw new APIError(inLanguage(crmErrors.doNotContact, language), 400, undefined, true)
          if (idOf(contact.organization) !== idOf(merged.organization))
            throw new APIError(
              inLanguage(crmErrors.contactOrganization, language),
              400,
              undefined,
              true,
            )
        }
        if (merged.direction === 'inbound' && operation === 'create' && !next.receivedAt)
          next.receivedAt = new Date().toISOString()
        return { ...data, ...next }
      },
    ],
  },
  fields: [
    {
      name: 'actions',
      type: 'ui',
      admin: {
        components: { Field: '/admin/ApproveAndSendField.tsx#ApproveAndSendField' },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'direction',
          label: label('Direction', 'Dirección'),
          type: 'select',
          required: true,
          defaultValue: 'outbound',
          index: true,
          options: options(DIRECTIONS),
        },
        {
          name: 'status',
          label: label('Status', 'Estado'),
          type: 'select',
          required: true,
          defaultValue: 'draft',
          index: true,
          options: options(MESSAGE_STATUSES),
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'organization',
          label: label('Organization', 'Organización'),
          type: 'relationship',
          relationTo: 'organizations',
          required: true,
          index: true,
        },
        {
          name: 'contact',
          label: label('Contact', 'Contacto'),
          type: 'relationship',
          relationTo: 'contacts',
          index: true,
        },
      ],
    },
    { name: 'subject', label: label('Subject', 'Asunto'), type: 'text', required: true },
    {
      name: 'body',
      label: label('Body (plain text)', 'Cuerpo (texto plano)'),
      type: 'textarea',
      required: true,
      admin: {
        rows: 14,
        description: label(
          'Plain text. The footer (who we are, privacy, how to opt out) is added when sending.',
          'Texto plano. El pie (quiénes somos, privacidad, cómo darse de baja) se añade al enviar.',
        ),
      },
    },
    {
      name: 'replyingTo',
      label: label('In reply to', 'En respuesta a'),
      type: 'relationship',
      relationTo: 'messages',
      admin: {
        description: label(
          'Pick the received message you answer: the email is threaded under it.',
          'Elige el mensaje recibido al que respondes: el correo se enlaza a su hilo.',
        ),
      },
    },
    {
      name: 'followUpDate',
      label: label('Follow-up date', 'Fecha de seguimiento'),
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: label(
          'Set on the organization when the email goes out. Empty: 7 days later.',
          'Se aplica a la organización al enviar. Vacío: 7 días después.',
        ),
      },
    },
    {
      name: 'handled',
      label: label('Handled', 'Atendido'),
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: label(
          'For received messages: tick once the reply has been dealt with.',
          'En mensajes recibidos: márcalo cuando la respuesta esté atendida.',
        ),
      },
    },
    {
      name: 'sentAt',
      label: label('Sent', 'Enviado el'),
      type: 'date',
      index: true,
      ...protectedField,
    },
    {
      name: 'receivedAt',
      label: label('Received', 'Recibido el'),
      type: 'date',
      index: true,
      ...protectedField,
    },
    { name: 'messageId', label: 'Message-ID', type: 'text', index: true, ...protectedField },
    { name: 'inReplyTo', label: 'In-Reply-To', type: 'text', ...protectedField },
    { name: 'references', label: 'References', type: 'textarea', ...protectedField },
    { name: 'error', label: label('Error', 'Error'), type: 'text', ...protectedField },
    {
      name: 'approvedBy',
      label: label('Approved by', 'Aprobado por'),
      type: 'relationship',
      relationTo: 'users',
      ...protectedField,
    },
    {
      name: 'approvedAt',
      label: label('Approved on', 'Aprobado el'),
      type: 'date',
      ...protectedField,
    },
    {
      name: 'attachmentNames',
      label: label('Attachments (names only)', 'Adjuntos (solo nombres)'),
      type: 'array',
      admin: { readOnly: true },
      fields: [{ name: 'name', type: 'text' }],
    },
  ],
}
