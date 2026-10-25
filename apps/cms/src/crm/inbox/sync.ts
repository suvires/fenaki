import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import type { Payload } from 'payload'
import { imapConfig } from '../mailbox.ts'
import {
  isOptOut,
  matchReply,
  normalizeAddress,
  normalizeId,
  parseIds,
  type KnownContact,
  type KnownOutbound,
} from './match.ts'
import { stripQuoted } from './strip.ts'

type Env = Record<string, string | undefined>

export interface SyncSummary {
  /** No IMAP settings: the job does nothing. */
  skipped?: boolean
  /** First run, or the mailbox was rebuilt: remembered where it ends and imported nothing. */
  baselined?: boolean
  seen: number
  stored: number
}

/** The biggest part of a message downloaded for storing: the text is early, attachments late. */
const MAX_SOURCE_BYTES = 1_000_000

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * Reads new messages from the mailbox's INBOX and stores the ones that belong to the CRM.
 *
 * Read-only by construction: INBOX is opened with `readOnly` (IMAP EXAMINE, so even flags cannot
 * change), headers and bodies are fetched with PEEK, and nothing is deleted, moved or marked.
 * Messages that match nothing are not stored; only their UID is remembered.
 */
export async function syncInbox(payload: Payload, env: Env = process.env): Promise<SyncSummary> {
  const imap = imapConfig(env)
  if (!imap) return { skipped: true, seen: 0, stored: 0 }
  const own = new Set(
    [env.MAILBOX_USER, env.EMAIL_FROM_ADDRESS]
      .filter((a): a is string => Boolean(a))
      .map(normalizeAddress),
  )

  const client = new ImapFlow({
    host: imap.host,
    port: imap.port,
    secure: imap.secure,
    auth: { user: env.MAILBOX_USER ?? '', pass: env.MAILBOX_PASSWORD ?? '' },
    logger: false,
  })
  await client.connect()
  const summary: SyncSummary = { seen: 0, stored: 0 }
  let lock: Awaited<ReturnType<ImapFlow['getMailboxLock']>> | undefined
  let lastUid: number | undefined
  let uidValidity: string | undefined
  try {
    lock = await client.getMailboxLock('INBOX', { readOnly: true })
    const mailbox = client.mailbox
    if (!mailbox) throw new Error('INBOX did not open')
    uidValidity = String(mailbox.uidValidity)
    const state = await payload.findGlobal({ slug: 'crm-inbox', depth: 0 })
    if (state.lastUid == null || state.uidValidity !== uidValidity) {
      lastUid = mailbox.uidNext - 1
      summary.baselined = true
      return summary
    }
    lastUid = state.lastUid

    // Headers only, for every message newer than the last processed UID.
    const candidates: { uid: number; headers: Buffer }[] = []
    if (mailbox.uidNext - 1 > lastUid) {
      for await (const message of client.fetch(
        `${lastUid + 1}:*`,
        { uid: true, headers: true },
        { uid: true },
      )) {
        if (message.uid > lastUid && message.headers)
          candidates.push({ uid: message.uid, headers: message.headers })
      }
    }
    if (candidates.length === 0) return summary

    const [outbound, contacts] = await Promise.all([loadOutbound(payload), loadContacts(payload)])
    const context = { ownAddresses: own, outbound, contacts }
    candidates.sort((a, b) => a.uid - b.uid)

    for (const candidate of candidates) {
      summary.seen++
      const headers = await simpleParser(candidate.headers)
      const match = matchReply(
        {
          messageId: headers.messageId,
          inReplyTo: headers.inReplyTo,
          references: headers.references ? ([] as string[]).concat(headers.references) : undefined,
          fromAddress: headers.from?.value[0]?.address,
        },
        context,
      )
      if (match.kind !== 'ignore') {
        const stored = await storeReply(payload, client, candidate.uid, match)
        if (stored) summary.stored++
      }
      lastUid = candidate.uid
    }
    return summary
  } finally {
    lock?.release()
    await client.logout().catch(() => {})
    if (lastUid !== undefined)
      await payload.updateGlobal({
        slug: 'crm-inbox',
        data: { lastUid, uidValidity, lastRunAt: new Date().toISOString(), lastError: null },
        overrideAccess: true,
      })
  }
}

async function loadOutbound(payload: Payload) {
  const found = await payload.find({
    collection: 'messages',
    where: { direction: { equals: 'outbound' }, messageId: { exists: true } },
    select: { messageId: true, organization: true, contact: true },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })
  const map = new Map<string, KnownOutbound>()
  for (const doc of found.docs) {
    if (!doc.messageId) continue
    const organization =
      typeof doc.organization === 'object' ? doc.organization.id : doc.organization
    const contact = typeof doc.contact === 'object' ? doc.contact?.id : doc.contact
    map.set(normalizeId(doc.messageId), { organization, contact: contact ?? null })
  }
  return map
}

async function loadContacts(payload: Payload) {
  const found = await payload.find({
    collection: 'contacts',
    select: { email: true, organization: true },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })
  const map = new Map<string, KnownContact>()
  for (const doc of found.docs) {
    const organization =
      typeof doc.organization === 'object' ? doc.organization.id : doc.organization
    map.set(normalizeAddress(doc.email), { id: doc.id, organization })
  }
  return map
}

async function storeReply(
  payload: Payload,
  client: ImapFlow,
  uid: number,
  match: { organization: number; contact: number | null },
): Promise<boolean> {
  const fetched = await client.fetchOne(
    String(uid),
    { source: { maxLength: MAX_SOURCE_BYTES } },
    { uid: true },
  )
  if (!fetched || !fetched.source) return false
  const parsed = await simpleParser(fetched.source)
  const messageId = parsed.messageId ? normalizeId(parsed.messageId) : undefined
  if (messageId) {
    const duplicate = await payload.count({
      collection: 'messages',
      where: { direction: { equals: 'inbound' }, messageId: { equals: `<${messageId}>` } },
      overrideAccess: true,
    })
    if (duplicate.totalDocs > 0) return false
  }

  // Plain text only, quoted history removed. HTML is never stored, so it can never be rendered.
  const body = stripQuoted(parsed.text ?? '')
  const receivedAt = (parsed.date ?? new Date()).toISOString()
  const references = ([] as string[]).concat(parsed.references ?? []).join(' ')
  await payload.create({
    collection: 'messages',
    data: {
      direction: 'inbound',
      status: 'received',
      organization: match.organization,
      contact: match.contact,
      subject: (parsed.subject ?? '').slice(0, 300) || '(sin asunto)',
      body: body || '(sin texto)',
      messageId: messageId ? `<${messageId}>` : undefined,
      inReplyTo: one(
        parsed.inReplyTo ? parseIds(parsed.inReplyTo).map((i) => `<${i}>`) : undefined,
      ),
      references: references || undefined,
      receivedAt,
      attachmentNames: parsed.attachments
        .map((a) => a.filename)
        .filter((name): name is string => Boolean(name))
        .map((name) => ({ name: name.slice(0, 200) })),
    },
    overrideAccess: true,
  })

  const optOut = isOptOut(body)
  const organization = await payload.findByID({
    collection: 'organizations',
    id: match.organization,
    depth: 0,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'organizations',
    id: match.organization,
    data: {
      lastContactDate: receivedAt,
      nextFollowUpDate: null,
      ...(optOut
        ? { status: 'not_interested' as const }
        : organization.status === 'contacted' || organization.status === 'to_contact'
          ? { status: 'replied' as const }
          : {}),
    },
    overrideAccess: true,
  })
  // «Reply "no" to never hear from us again»: kept as a promise, not as a to-do for a person.
  if (match.contact && optOut)
    await payload.update({
      collection: 'contacts',
      id: match.contact,
      data: { doNotContact: true, doNotContactReason: 'Replied «no» to an outreach email' },
      overrideAccess: true,
    })
  return true
}
