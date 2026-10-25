import { label, type AdminLabel } from '../labels.ts'

export const ORGANIZATION_TYPES = {
  festival: label('Festival', 'Festival'),
  school: label('School', 'Escuela'),
  brand: label('Brand', 'Marca'),
  institution: label('Institution', 'Institución'),
  other: label('Other', 'Otro'),
} satisfies Record<string, AdminLabel>

export const PRIORITIES = {
  A: label('A (first)', 'A (primero)'),
  B: label('B', 'B'),
  C: label('C (later)', 'C (después)'),
} satisfies Record<string, AdminLabel>

export const PRODUCTS = {
  showcase: label('Showcase', 'Escaparate'),
  collection: label('Sponsored collection', 'Colección patrocinada'),
  sponsorship: label('Other sponsorship', 'Otro patrocinio'),
  other: label('Other', 'Otro'),
} satisfies Record<string, AdminLabel>

/** The sales pipeline, in order. */
export const PIPELINE = {
  to_contact: label('To contact', 'Por contactar'),
  contacted: label('Contacted', 'Contactada'),
  replied: label('Replied', 'Ha respondido'),
  proposal: label('Proposal', 'Propuesta'),
  negotiation: label('Negotiation', 'Negociación'),
  won: label('Won', 'Ganada'),
  lost: label('Lost', 'Perdida'),
  not_interested: label('Not interested', 'No interesa'),
} satisfies Record<string, AdminLabel>
export type PipelineStatus = keyof typeof PIPELINE

export const LEGAL_BASES = {
  published_for_proposals: label(
    'Address published for proposals',
    'Dirección publicada para recibir propuestas',
  ),
  existing_relationship: label('Existing relationship', 'Relación existente'),
  wrote_first: label('They wrote first', 'Nos escribieron primero'),
  other: label('Other', 'Otra'),
} satisfies Record<string, AdminLabel>
export type LegalBasis = keyof typeof LEGAL_BASES

export const DIRECTIONS = {
  outbound: label('Outbound', 'Saliente'),
  inbound: label('Inbound', 'Entrante'),
} satisfies Record<string, AdminLabel>

export const MESSAGE_STATUSES = {
  draft: label('Draft', 'Borrador'),
  approved: label('Approved', 'Aprobado'),
  sending: label('Sending', 'Enviando'),
  sent: label('Sent', 'Enviado'),
  failed: label('Failed', 'Fallido'),
  received: label('Received', 'Recibido'),
} satisfies Record<string, AdminLabel>
export type MessageStatus = keyof typeof MESSAGE_STATUSES

export const DEFAULT_DAILY_LIMIT = 20
export const DEFAULT_FOLLOW_UP_DAYS = 7
