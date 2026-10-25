/**
 * Decides whether an incoming email belongs to the CRM. Pure: the sync job loads the known
 * outbound Message-IDs and contact addresses and passes them in. Anything that does not match
 * (AWS, Cloudflare Access codes, newsletters, other mail) is ignored and never stored.
 */
export interface IncomingHeaders {
  messageId?: string | null
  inReplyTo?: string | null
  references?: string[] | null
  fromAddress?: string | null
}

export interface KnownOutbound {
  organization: number
  contact: number | null
}

export interface KnownContact {
  id: number
  organization: number
}

export interface MatchContext {
  /** The mailbox's own addresses: its BCC-style copies and Sent echoes are not replies. */
  ownAddresses: Set<string>
  /** Message-ID (normalized) of every outbound message we sent. */
  outbound: Map<string, KnownOutbound>
  /** Contacts by lowercased email address. */
  contacts: Map<string, KnownContact>
}

export type Match =
  | { kind: 'thread'; organization: number; contact: number | null; viaMessageId: string }
  | { kind: 'sender'; organization: number; contact: number }
  | { kind: 'ignore'; reason: 'own-message' | 'automated' | 'no-match' }

export const normalizeId = (id: string): string => id.trim().replace(/^<|>$/g, '').toLowerCase()

/** The `<id>` tokens of a Message-ID, In-Reply-To or References header. */
export function parseIds(header: string | string[] | null | undefined): string[] {
  const text = Array.isArray(header) ? header.join(' ') : (header ?? '')
  return [...text.matchAll(/<([^<>\s]+)>/g)].map((m) => normalizeId(m[1] ?? ''))
}

export const normalizeAddress = (address: string): string => address.trim().toLowerCase()

const AUTOMATED_SENDER = /^(mailer-daemon|postmaster)@/i

export function matchReply(headers: IncomingHeaders, context: MatchContext): Match {
  const from = headers.fromAddress ? normalizeAddress(headers.fromAddress) : ''
  const ownId = headers.messageId ? normalizeId(headers.messageId) : ''

  if ((from && context.ownAddresses.has(from)) || (ownId && context.outbound.has(ownId)))
    return { kind: 'ignore', reason: 'own-message' }
  if (AUTOMATED_SENDER.test(from)) return { kind: 'ignore', reason: 'automated' }

  const chain = [...parseIds(headers.inReplyTo), ...(headers.references ?? []).flatMap(parseIds)]
  // Latest first: the nearest ancestor decides when a thread spans several organizations.
  for (const id of [...chain].reverse()) {
    const known = context.outbound.get(id)
    if (known)
      return {
        kind: 'thread',
        organization: known.organization,
        contact: from ? (context.contacts.get(from)?.id ?? known.contact) : known.contact,
        viaMessageId: id,
      }
  }

  const contact = from ? context.contacts.get(from) : undefined
  if (contact) return { kind: 'sender', organization: contact.organization, contact: contact.id }
  return { kind: 'ignore', reason: 'no-match' }
}

const OPT_OUT = new Set([
  'no',
  'no gracias',
  'baja',
  'stop',
  'unsubscribe',
  'remove',
  'darme de baja',
  'dadme de baja',
  'no quiero',
  'no me escribais mas',
  'no me escribas mas',
])

/** True when the reply is just «no» (or «baja», «stop»…): the opt-out the footer promises. */
export function isOptOut(text: string): boolean {
  const firstLine = text.split('\n').find((line) => line.trim()) ?? ''
  const normalized = firstLine
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return OPT_OUT.has(normalized)
}
