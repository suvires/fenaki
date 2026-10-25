import { ImapFlow } from 'imapflow'
import MailComposer from 'nodemailer/lib/mail-composer/index.js'
import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer'
import type { Payload } from 'payload'
import { isAdminUser } from '../access.ts'
import type { Contact, Message, Organization, User } from '../payload-types.ts'
import { composeOutbound, newMessageId, referencesFor } from './compose.ts'
import { DEFAULT_FOLLOW_UP_DAYS } from './constants.ts'
import { CrmError } from './errors.ts'
import { checkDailyLimit, dailyLimit, followUpAfter, startOfDay } from './limits.ts'
import { mailboxConfig, type MailboxConfig } from './mailbox.ts'
import { idOf } from './messageGate.ts'

type Env = Record<string, string | undefined>

export interface SendDeps {
  payload: Payload
  /** The signed-in user who clicked «approve and send». */
  user: Pick<User, 'id' | 'role'> | null | undefined
  env?: Env
  now?: Date
  transport?: { sendMail: (message: SendMailOptions) => Promise<unknown> }
  /** Saves the sent copy in the mailbox's Sent folder. Replaceable in tests. */
  appendToSent?: (config: MailboxConfig, raw: Buffer, date: Date) => Promise<void>
}

export interface SendResult {
  messageId: string
  /** Set when the email went out but its copy could not be saved in the Sent folder. */
  sentCopyError?: string
}

/** Messages being sent by this process: a second click while one is in flight is refused. */
const inFlight = new Set<number | string>()

export function createTransport(config: MailboxConfig): Transporter {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: config.smtp.requireTLS,
    auth: { user: config.user, pass: config.password },
  })
}

const SENT_NAMES = ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent', 'Éléments envoyés']

/**
 * The only write to the mailbox: appends the sent email (same bytes, same Message-ID) to the
 * Sent folder so it shows in Zimbra. INBOX is never opened for writing.
 */
export async function appendToSentFolder(config: MailboxConfig, raw: Buffer, date: Date) {
  const client = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    auth: { user: config.user, pass: config.password },
    logger: false,
  })
  await client.connect()
  try {
    let folder = config.sentFolder
    if (!folder) {
      const boxes = await client.list()
      folder =
        boxes.find((box) => box.specialUse === '\\Sent')?.path ??
        boxes.find((box) => SENT_NAMES.some((n) => n.toLowerCase() === box.path.toLowerCase()))
          ?.path
    }
    if (!folder) throw new Error('no Sent folder found (set MAILBOX_SENT_FOLDER)')
    await client.append(folder, raw, ['\\Seen'], date)
  } finally {
    await client.logout().catch(() => {})
  }
}

const trim = (text: string) => (text.length > 500 ? `${text.slice(0, 500)}…` : text)

/**
 * Sends one approved outbound message through the mailbox's SMTP server. Everything the policy
 * demands is checked here again, not only in the admin: an admin sends, the message is approved by
 * an admin, the contact is not marked «do not contact», the daily limit holds.
 */
export async function sendApprovedMessage(id: number, deps: SendDeps): Promise<SendResult> {
  const { payload, user, env = process.env, now = new Date() } = deps
  if (!isAdminUser(user)) throw new CrmError('forbidden', 403)
  const config = mailboxConfig(env)
  if (!config) throw new CrmError('notConfigured', 503)
  if (inFlight.has(id)) throw new CrmError('busy', 409)
  inFlight.add(id)
  try {
    const message = await payload
      .findByID({ collection: 'messages', id, depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!message) throw new CrmError('notFound', 404)
    if (message.direction !== 'outbound') throw new CrmError('notOutbound')
    if (message.status !== 'approved' || !message.approvedBy || !message.approvedAt)
      throw new CrmError('notApproved', 409)
    const approver = await payload
      .findByID({
        collection: 'users',
        id: idOf(message.approvedBy) as number,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)
    if (!isAdminUser(approver)) throw new CrmError('notApproved', 409)

    const contactId = idOf(message.contact)
    const contact = contactId
      ? await payload.findByID({
          collection: 'contacts',
          id: contactId as number,
          depth: 0,
          overrideAccess: true,
        })
      : null
    if (!contact) throw new CrmError('contactRequired')
    if (contact.doNotContact) throw new CrmError('doNotContact')
    if (!contact.email) throw new CrmError('noContactEmail')
    if (idOf(contact.organization) !== idOf(message.organization))
      throw new CrmError('contactOrganization')

    const sentToday = await payload.count({
      collection: 'messages',
      where: {
        direction: { equals: 'outbound' },
        status: { in: ['sent', 'sending'] },
        sentAt: { greater_than_equal: startOfDay(now).toISOString() },
      },
      overrideAccess: true,
    })
    const limit = checkDailyLimit(sentToday.totalDocs, dailyLimit(env))
    if (!limit.allowed) throw new CrmError('dailyLimit', 429, String(limit.limit))

    let inReplyTo = message.inReplyTo ?? undefined
    let references = message.references ?? undefined
    const parentId = idOf(message.replyingTo)
    if (parentId) {
      const parent = await payload.findByID({
        collection: 'messages',
        id: parentId as number,
        depth: 0,
        overrideAccess: true,
      })
      if (parent.messageId) {
        inReplyTo = parent.messageId
        references = referencesFor(parent)
      }
    }

    const messageId = message.messageId || newMessageId(config.user)
    const followUp = message.followUpDate
      ? new Date(message.followUpDate)
      : followUpAfter(now, DEFAULT_FOLLOW_UP_DAYS)

    // Claim it: from here a second attempt sees `sending` and stops. No user on the request, so
    // the gate treats this as the system.
    await payload.update({
      collection: 'messages',
      id,
      data: {
        status: 'sending',
        sentAt: now.toISOString(),
        messageId,
        inReplyTo,
        references,
        followUpDate: followUp.toISOString(),
        error: null,
      },
      overrideAccess: true,
    })

    const options = composeOutbound({
      fromName: config.fromName,
      fromAddress: config.user,
      to: { email: contact.email, name: contact.name },
      subject: message.subject,
      body: message.body,
      messageId,
      inReplyTo,
      references,
      siteUrl: env.WEB_URL ?? 'https://fenaki.tv',
      date: now,
    })
    // Built once, sent as raw bytes and appended to Sent as the same bytes.
    const raw = await new MailComposer(options).compile().build()
    const transport = deps.transport ?? createTransport(config)
    try {
      await transport.sendMail({
        envelope: { from: config.user, to: [contact.email] },
        raw,
      })
    } catch (error) {
      await payload.update({
        collection: 'messages',
        id,
        data: { status: 'failed', sentAt: null, error: trim(String((error as Error).message)) },
        overrideAccess: true,
      })
      throw new CrmError('sendFailed', 502, trim(String((error as Error).message)))
    }

    const result: SendResult = { messageId }
    try {
      await (deps.appendToSent ?? appendToSentFolder)(config, raw, now)
    } catch (error) {
      result.sentCopyError = trim(String((error as Error).message))
    }
    await payload.update({
      collection: 'messages',
      id,
      data: {
        status: 'sent',
        error: result.sentCopyError ? `Sent copy not saved: ${result.sentCopyError}` : null,
      },
      overrideAccess: true,
    })
    await updateOrganizationAfterSend(payload, idOf(message.organization) as number, now, followUp)
    return result
  } finally {
    inFlight.delete(id)
  }
}

async function updateOrganizationAfterSend(
  payload: Payload,
  organizationId: number,
  now: Date,
  followUp: Date,
) {
  const organization: Organization = await payload.findByID({
    collection: 'organizations',
    id: organizationId,
    depth: 0,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'organizations',
    id: organizationId,
    data: {
      lastContactDate: now.toISOString(),
      nextFollowUpDate: followUp.toISOString(),
      // Only the first email moves the pipeline; later stages stay where they are.
      ...(organization.status === 'to_contact' ? { status: 'contacted' as const } : {}),
    },
    overrideAccess: true,
  })
}

export type { Contact, Message }
