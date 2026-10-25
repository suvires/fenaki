import { label, type AdminLabel } from '../labels.ts'

export const crmErrors = {
  forbidden: label('Only an admin can do this.', 'Solo un administrador puede hacerlo.'),
  'agent-cannot-approve': label(
    'An agent cannot approve or send emails: leave the message as a draft for an admin.',
    'Un agente no puede aprobar ni enviar correos: deja el mensaje como borrador para un administrador.',
  ),
  'agent-only-drafts': label(
    'An agent can only edit messages that are still drafts.',
    'Un agente solo puede editar mensajes que sigan en borrador.',
  ),
  'agent-only-handled': label(
    'An agent cannot create received messages.',
    'Un agente no puede crear mensajes recibidos.',
  ),
  'invalid-transition': label(
    'The status of a message can only be sent, sending or failed by the send action.',
    'El estado «enviado», «enviando» o «fallido» solo lo pone la acción de enviar.',
  ),
  locked: label(
    'A sent or received message cannot be edited.',
    'Un mensaje enviado o recibido no se puede editar.',
  ),
  'inbound-status': label(
    'A received message keeps the status «received».',
    'Un mensaje recibido mantiene el estado «recibido».',
  ),
  anonymous: label('Sign in first.', 'Inicia sesión primero.'),
  doNotContact: label(
    'This contact is marked «do not contact».',
    'Este contacto está marcado como «no contactar».',
  ),
  contactOrganization: label(
    'The contact does not belong to the message’s organization.',
    'El contacto no pertenece a la organización del mensaje.',
  ),
  contactRequired: label(
    'An outbound message needs a contact.',
    'Un mensaje enviado necesita un contacto.',
  ),
  agentClearsDoNotContact: label(
    'Only an admin can take the «do not contact» mark off a contact.',
    'Solo un administrador puede quitar la marca «no contactar» de un contacto.',
  ),
  notApproved: label('The message is not approved.', 'El mensaje no está aprobado.'),
  notOutbound: label('Only outbound messages are sent.', 'Solo se envían mensajes salientes.'),
  noContactEmail: label('The contact has no email address.', 'El contacto no tiene correo.'),
  dailyLimit: label(
    'The daily limit of emails was reached; try again tomorrow.',
    'Se alcanzó el límite diario de correos; inténtalo mañana.',
  ),
  notConfigured: label(
    'The CRM mailbox is not configured (MAILBOX_* variables).',
    'El buzón del CRM no está configurado (variables MAILBOX_*).',
  ),
  busy: label('This message is already being sent.', 'Este mensaje ya se está enviando.'),
  notFound: label('Message not found.', 'Mensaje no encontrado.'),
  sendFailed: label('The email could not be sent:', 'No se pudo enviar el correo:'),
} satisfies Record<string, AdminLabel>

export type CrmErrorCode = keyof typeof crmErrors

/** An error with a code the endpoints and hooks turn into a translated message. */
export class CrmError extends Error {
  code: CrmErrorCode
  status: number
  constructor(code: CrmErrorCode, status = 400, detail?: string) {
    super(detail ? `${crmErrors[code].en} ${detail}` : crmErrors[code].en)
    this.code = code
    this.status = status
  }
}
