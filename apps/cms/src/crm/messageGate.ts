import type { MessageStatus } from './constants.ts'

/**
 * The approval gate, as a pure function so it can be tested without a database. The `messages`
 * collection runs it in a hook on every write, on top of its access control:
 *
 * - `system` (no user: the jobs worker and the send action) may do anything.
 * - `agent` (the AI) creates outbound drafts and edits them while they are drafts. It cannot
 *   approve or send, and on received messages it can only mark them handled.
 * - `admin` (the human) approves (draft → approved), takes an approval back, and re-approves
 *   failed messages. Only the system marks messages sending, sent or failed.
 */
export type Actor = 'system' | 'admin' | 'agent' | 'anonymous'

export interface MessageState {
  direction?: 'outbound' | 'inbound' | null
  status?: MessageStatus | null
  subject?: string | null
  body?: string | null
  organization?: unknown
  contact?: unknown
  replyingTo?: unknown
  followUpDate?: string | null
  handled?: boolean | null
  approvedBy?: unknown
  approvedAt?: string | null
  [key: string]: unknown
}

export type GateError =
  | 'anonymous'
  | 'agent-cannot-approve'
  | 'agent-only-drafts'
  | 'agent-only-handled'
  | 'invalid-transition'
  | 'locked'
  | 'inbound-status'

export type GateResult =
  { ok: true; data: Record<string, unknown> } | { ok: false; error: GateError }

/** What an email says once it is approved: changing any of this takes the approval back. */
const CONTENT = ['subject', 'body', 'organization', 'contact', 'replyingTo', 'direction'] as const
/** Set by the system only; whatever a user sends for them is discarded. */
const SYSTEM_FIELDS = [
  'messageId',
  'sentAt',
  'receivedAt',
  'error',
  'approvedBy',
  'approvedAt',
] as const

export const idOf = (value: unknown): unknown =>
  value && typeof value === 'object' && 'id' in value ? (value as { id: unknown }).id : value

const same = (a: unknown, b: unknown) => (idOf(a) ?? null) === (idOf(b) ?? null)

export interface GateInput {
  actor: Actor
  operation: 'create' | 'update'
  original?: MessageState
  data: MessageState
  userId?: unknown
  now?: Date
}

export function checkMessageWrite({
  actor,
  operation,
  original,
  data,
  userId,
  now = new Date(),
}: GateInput): GateResult {
  if (actor === 'anonymous') return { ok: false, error: 'anonymous' }
  if (actor === 'system') return { ok: true, data }

  const base: MessageState = operation === 'update' ? (original ?? {}) : {}
  const next: MessageState = { ...base, ...data }
  const out: Record<string, unknown> = { ...data }
  for (const field of SYSTEM_FIELDS) {
    if (operation === 'update')
      out[field] = field === 'approvedBy' ? idOf(base[field]) : base[field]
    else out[field] = undefined
  }

  const direction = next.direction ?? 'outbound'
  const from = operation === 'update' ? (base.status ?? 'draft') : undefined
  const to = (next.status ?? (direction === 'inbound' ? 'received' : 'draft')) as MessageStatus
  out.status = to

  // Messages that went out or came in are history; only bookkeeping fields change.
  if (operation === 'update' && (from === 'sent' || from === 'sending' || from === 'received')) {
    const changed = to !== from || CONTENT.some((field) => !same(next[field], base[field]))
    if (changed) return { ok: false, error: 'locked' }
    return { ok: true, data: out }
  }

  if (direction === 'inbound') {
    if (actor === 'agent') return { ok: false, error: 'agent-only-handled' }
    if (to !== 'received') return { ok: false, error: 'inbound-status' }
    return { ok: true, data: out }
  }

  // From here on: an outbound message that has not gone out yet.
  if (to === 'sending' || to === 'sent' || to === 'failed' || to === 'received') {
    // `failed` can only be kept, never set, by a user.
    if (!(to === 'failed' && from === 'failed')) {
      return { ok: false, error: actor === 'agent' ? 'agent-cannot-approve' : 'invalid-transition' }
    }
  }

  if (actor === 'agent') {
    if (operation === 'update' && from !== 'draft') return { ok: false, error: 'agent-only-drafts' }
    if (to !== 'draft') return { ok: false, error: 'agent-cannot-approve' }
    return { ok: true, data: out }
  }

  // admin
  let status: MessageStatus = to
  if (
    operation === 'update' &&
    from === 'approved' &&
    to === 'approved' &&
    CONTENT.some((field) => !same(next[field], base[field]))
  ) {
    // The human approved what they read; changed text needs a new approval.
    status = 'draft'
  }
  out.status = status
  if (status === 'approved' && from !== 'approved') {
    out.approvedBy = userId
    out.approvedAt = now.toISOString()
  } else if (status === 'approved') {
    out.approvedBy = base.approvedBy
    out.approvedAt = base.approvedAt
  } else {
    out.approvedBy = null
    out.approvedAt = null
  }
  return { ok: true, data: out }
}
