/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known to exist */
/**
 * The CRM end to end, on real services: PostgreSQL (own database), Mailpit as the outgoing SMTP
 * server and GreenMail as the mailbox (IMAP and incoming SMTP).
 * import → draft as agent → approve and send as admin → reply matched from the inbox.
 */
import { ImapFlow } from 'imapflow'
import nodemailer, { type SendMailOptions } from 'nodemailer'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:8025'
const IMAP_PORT = Number(process.env.E2E_IMAP_PORT ?? 3143)
const SMTP_IN_PORT = Number(process.env.E2E_MAIL_SMTP_PORT ?? 3025)

Object.assign(process.env, {
  DATABASE_URL:
    process.env.E2E_CRM_DATABASE_URL ?? 'postgres://fenaki:fenaki@127.0.0.1:5432/fenaki_crm_test',
  PAYLOAD_SECRET: 'integration-test-secret-integration-test-secret',
  PAYLOAD_PUBLIC_SERVER_URL: 'http://localhost:3199',
  SMTP_HOST: '',
  MAILBOX_USER: 'hola@fenaki.tv',
  MAILBOX_PASSWORD: 'unused-with-auth-disabled',
  MAILBOX_IMAP_HOST: '127.0.0.1',
  MAILBOX_IMAP_PORT: String(IMAP_PORT),
  // Outgoing mail goes to Mailpit, as in development.
  MAILBOX_SMTP_HOST: '127.0.0.1',
  MAILBOX_SMTP_PORT: '1025',
  WEB_URL: 'https://fenaki.tv',
  // Its own search indexes, so it never touches the development ones.
  SEARCH_INDEX_PREFIX: 'crm_test_',
})
delete process.env.CRM_DAILY_SEND_LIMIT

const { default: config } = await import('../../src/payload.config.ts')
const { importOrganizations, parseOrganizationsCsv } =
  await import('../../src/crm/organizationsImport.ts')
const { payloadStore } = await import('../../src/crm/payloadStore.ts')
const { sendApprovedMessage } = await import('../../src/crm/send.ts')
const { syncInbox } = await import('../../src/crm/inbox/sync.ts')

const token = Math.random().toString(36).slice(2, 8)
// Invented organizations; the addresses live on example domains and are never really written to.
const CSV = [
  'nombre,tipo,pais,ciudad,web,proxima_edicion,por_que_encaja,producto_recomendado,contacto_publico,fuente,prioridad,notas',
  `Festival Prueba ${token},festival,España,Ciudad Ficticia,https://festival-${token}.example.org,,Encaja,escaparate,propuestas-${token}@festival.example.org,https://festival-${token}.example.org/bases,A,`,
  `Escuela Prueba ${token},escuela,México,Villa Inventada,https://escuela-${token}.example.org,,Encaja,colección,https://escuela-${token}.example.org/contacto,,B,`,
].join('\n')
const contactEmail = `propuestas-${token}@festival.example.org`

let payload: Payload
let admin: Awaited<ReturnType<Payload['create']>> & { role: 'admin' }
let agent: Awaited<ReturnType<Payload['create']>> & { role: 'agent' }
let organizationId: number
let contactId: number

// Runs a call as that user, access control and hooks included, as the REST API does.
const as = (user: { id: number | string; collection?: string }) => ({
  user: { ...user, collection: 'users' as const },
  overrideAccess: false as const,
})

async function mailpitSearch(query: string) {
  const response = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(query)}`)
  const body = (await response.json()) as { messages: { ID: string }[] }
  return body.messages
}

async function mailpitRaw(id: string) {
  return (await fetch(`${MAILPIT}/api/v1/message/${id}/raw`)).text()
}

function mailbox() {
  return new ImapFlow({
    host: '127.0.0.1',
    port: IMAP_PORT,
    secure: false,
    auth: { user: 'hola@fenaki.tv', pass: 'x' },
    logger: false,
  })
}

async function deliverToMailbox(message: SendMailOptions) {
  const transport = nodemailer.createTransport({
    host: '127.0.0.1',
    port: SMTP_IN_PORT,
    secure: false,
  })
  await transport.sendMail({ to: 'hola@fenaki.tv', ...message })
}

async function folderMessages(path: string) {
  const client = mailbox()
  await client.connect()
  try {
    const lock = await client.getMailboxLock(path, { readOnly: true })
    try {
      const found: { uid: number; flags: Set<string>; headers: string }[] = []
      for await (const m of client.fetch('1:*', { uid: true, flags: true, headers: true })) {
        found.push({
          uid: m.uid,
          flags: m.flags ?? new Set(),
          headers: m.headers?.toString() ?? '',
        })
      }
      return found
    } finally {
      lock.release()
    }
  } catch {
    return []
  } finally {
    await client.logout().catch(() => {})
  }
}

beforeAll(async () => {
  payload = await getPayload({ config })
  await payload.db.migrate()
  for (const collection of ['messages', 'contacts', 'organizations'] as const)
    await payload.delete({ collection, where: { id: { exists: true } } })
  await payload.delete({ collection: 'users', where: { email: { like: 'crm-test-' } } })
  await payload.updateGlobal({ slug: 'crm-inbox', data: { lastUid: null, uidValidity: null } })
  admin = (await payload.create({
    collection: 'users',
    data: {
      email: `crm-test-admin-${token}@example.org`,
      password: 'a-long-password-1',
      role: 'admin',
    },
  })) as typeof admin
  agent = (await payload.create({
    collection: 'users',
    data: {
      email: `crm-test-agent-${token}@example.org`,
      password: 'a-long-password-2',
      role: 'agent',
    },
  })) as typeof agent

  // The mailbox needs a Sent folder to append to, as Zimbra has.
  const client = mailbox()
  await client.connect()
  const existing = await client.list()
  if (!existing.some((box) => box.path === 'Sent')) await client.mailboxCreate('Sent')
  await client.logout()
})

afterAll(async () => {
  await payload?.destroy()
})

describe('the sales CRM, end to end', () => {
  it('imports the CSV, once', async () => {
    const rows = parseOrganizationsCsv(CSV)
    const first = await importOrganizations(rows, payloadStore(payload))
    expect(first).toMatchObject({ created: 2, contactsCreated: 1 })
    const again = await importOrganizations(rows, payloadStore(payload))
    expect(again).toMatchObject({ created: 0, updated: 2, contactsCreated: 0 })
    const organizations = await payload.find({ collection: 'organizations', limit: 0 })
    expect(organizations.totalDocs).toBe(2)
    const contact = (
      await payload.find({ collection: 'contacts', where: { email: { equals: contactEmail } } })
    ).docs[0]
    expect(contact).toMatchObject({ legalBasis: 'published_for_proposals', doNotContact: false })
    contactId = contact!.id
    organizationId = organizations.docs.find((o) => o.name.startsWith('Festival'))!.id
  })

  it('keeps the CRM away from the public and gives agents no catalog access', async () => {
    for (const collection of ['organizations', 'contacts', 'messages'] as const)
      await expect(
        payload.find({ collection, overrideAccess: false, user: null }),
      ).rejects.toThrow()
    await expect(
      payload.create({ collection: 'people', data: { name: 'X', slug: 'x' }, ...as(agent) }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'users',
        data: {
          email: `crm-test-x-${token}@example.org`,
          password: 'a-long-password-3',
          role: 'admin',
        },
        ...as(agent),
      }),
    ).rejects.toThrow()
  })

  let draftId: number
  let subject: string
  let messageId: string

  it('lets the agent draft, but not approve or send', async () => {
    subject = `Propuesta ${token}`
    const draft = await payload.create({
      collection: 'messages',
      data: {
        direction: 'outbound',
        status: 'draft',
        organization: organizationId,
        contact: contactId,
        subject,
        body: 'Hola,\n\nOs proponemos un escaparate.\n\nUn saludo.',
      },
      ...as(agent),
    })
    draftId = draft.id
    expect(draft.status).toBe('draft')

    await expect(
      payload.update({
        collection: 'messages',
        id: draftId,
        data: { status: 'approved' },
        ...as(agent),
      }),
    ).rejects.toThrow(/no puede aprobar/)
    await expect(sendApprovedMessage(draftId, { payload, user: agent })).rejects.toMatchObject({
      code: 'forbidden',
    })
    // Not even once an admin approved it: the agent's key is still no sender.
    await payload.update({
      collection: 'messages',
      id: draftId,
      data: { status: 'approved' },
      ...as(admin),
    })
    await expect(sendApprovedMessage(draftId, { payload, user: agent })).rejects.toMatchObject({
      code: 'forbidden',
    })
    await payload.update({
      collection: 'messages',
      id: draftId,
      data: { status: 'draft' },
      ...as(admin),
    })
  })

  it('sends after approval through the mailbox SMTP and saves the copy in Sent', async () => {
    await payload.update({
      collection: 'messages',
      id: draftId,
      data: { status: 'approved' },
      ...as(admin),
    })
    const approved = await payload.findByID({ collection: 'messages', id: draftId })
    expect(approved).toMatchObject({ status: 'approved' })
    expect(approved.approvedBy).toBeTruthy()

    const result = await sendApprovedMessage(draftId, { payload, user: admin })
    expect(result.sentCopyError).toBeUndefined()
    messageId = result.messageId

    const [found] = await mailpitSearch(`subject:"${subject}"`)
    expect(found).toBeDefined()
    const raw = await mailpitRaw(found!.ID)
    expect(raw).toContain('From: FENAKI <hola@fenaki.tv>')
    expect(raw).toContain(`To: ${contactEmail}`)
    expect(raw).toContain('Reply-To: hola@fenaki.tv')
    expect(raw).toContain(`Message-ID: ${messageId}`)
    expect(raw).not.toMatch(/^bcc:/im)
    expect(raw).toContain('/es/privacidad')

    const sent = await folderMessages('Sent')
    expect(sent.some((m) => m.headers.includes(messageId))).toBe(true)

    const message = await payload.findByID({ collection: 'messages', id: draftId })
    expect(message).toMatchObject({ status: 'sent', messageId })
    const organization = await payload.findByID({ collection: 'organizations', id: organizationId })
    expect(organization.status).toBe('contacted')
    expect(organization.lastContactDate).toBeTruthy()
    expect(organization.nextFollowUpDate).toBeTruthy()
    await expect(
      payload.update({ collection: 'messages', id: draftId, data: { body: 'x' }, ...as(admin) }),
    ).rejects.toThrow()
  })

  it('syncs only the replies that belong to the CRM, and touches nothing in the mailbox', async () => {
    // First run: remembers where the mailbox ends and imports nothing.
    expect(await syncInbox(payload)).toMatchObject({ baselined: true, stored: 0 })

    await deliverToMailbox({
      from: 'AWS Notifications <no-reply@sns.amazonaws.com>',
      subject: `Unrelated ${token}`,
      text: 'Your AWS code is 123456',
    })
    // The mailbox's own copy of what we sent.
    await deliverToMailbox({
      from: 'Fenaki <hola@fenaki.tv>',
      subject,
      text: 'copy',
      messageId,
    })
    await deliverToMailbox({
      from: `Ana <${contactEmail}>`,
      subject: `Re: ${subject}`,
      text: 'Nos interesa, ¿cuándo podemos hablar?\n\nEl lun, 2 nov 2026, Fenaki <hola@fenaki.tv> escribió:\n> Hola,\n> Os proponemos un escaparate.',
      inReplyTo: messageId,
      references: messageId,
      attachments: [{ filename: 'bases.pdf', content: 'pdf' }],
    })

    const before = await folderMessages('INBOX')
    const summary = await syncInbox(payload)
    expect(summary).toMatchObject({ seen: 3, stored: 1 })

    const inbound = await payload.find({
      collection: 'messages',
      where: { direction: { equals: 'inbound' } },
    })
    expect(inbound.totalDocs).toBe(1)
    expect(inbound.docs[0]).toMatchObject({
      status: 'received',
      handled: false,
      body: 'Nos interesa, ¿cuándo podemos hablar?',
      attachmentNames: [{ name: 'bases.pdf' }],
    })
    expect(inbound.docs[0]?.inReplyTo).toBe(messageId.toLowerCase())
    const organization = await payload.findByID({ collection: 'organizations', id: organizationId })
    expect(organization).toMatchObject({ status: 'replied', nextFollowUpDate: null })

    // Nothing unrelated was stored.
    const all = await payload.count({ collection: 'messages' })
    expect(all.totalDocs).toBe(2)
    // Running again finds nothing new.
    expect(await syncInbox(payload)).toMatchObject({ seen: 0, stored: 0 })
    // The mailbox is as it was: same messages, none marked as read, nothing deleted.
    const after = await folderMessages('INBOX')
    expect(after.map((m) => m.uid)).toEqual(before.map((m) => m.uid))
    expect(after.every((m) => !m.flags.has('\\Seen') && !m.flags.has('\\Deleted'))).toBe(true)
  })

  it('answers «no» by never writing to that contact again', async () => {
    await deliverToMailbox({
      from: contactEmail,
      subject: `Re: ${subject}`,
      text: 'No',
      inReplyTo: messageId,
    })
    expect(await syncInbox(payload)).toMatchObject({ stored: 1 })
    const contact = await payload.findByID({ collection: 'contacts', id: contactId })
    expect(contact.doNotContact).toBe(true)
    expect(contact.doNotContactDate).toBeTruthy()
    const organization = await payload.findByID({ collection: 'organizations', id: organizationId })
    expect(organization.status).toBe('not_interested')

    await expect(
      payload.create({
        collection: 'messages',
        data: {
          direction: 'outbound',
          status: 'draft',
          organization: organizationId,
          contact: contactId,
          subject: 'Otra',
          body: 'x',
        },
        ...as(agent),
      }),
    ).rejects.toThrow(/do not contact|no contactar/i)
    // An agent cannot clear the mark either.
    await expect(
      payload.update({
        collection: 'contacts',
        id: contactId,
        data: { doNotContact: false },
        ...as(agent),
      }),
    ).rejects.toThrow()
  })

  it('stops at the daily limit', async () => {
    const other = await payload.create({
      collection: 'contacts',
      data: {
        email: `otra-${token}@festival.example.org`,
        organization: organizationId,
        legalBasis: 'wrote_first',
        legalEvidence: 'Escribieron primero',
      },
      ...as(agent),
    })
    const next = await payload.create({
      collection: 'messages',
      data: {
        direction: 'outbound',
        status: 'draft',
        organization: organizationId,
        contact: other.id,
        subject: `Segunda ${token}`,
        body: 'Hola',
      },
      ...as(agent),
    })
    await payload.update({
      collection: 'messages',
      id: next.id,
      data: { status: 'approved' },
      ...as(admin),
    })
    await expect(
      sendApprovedMessage(next.id, {
        payload,
        user: admin,
        env: { ...process.env, CRM_DAILY_SEND_LIMIT: '1' },
      }),
    ).rejects.toMatchObject({ code: 'dailyLimit' })
    const unsent = await payload.findByID({ collection: 'messages', id: next.id })
    expect(unsent.status).toBe('approved')
    expect(await mailpitSearch(`subject:"Segunda ${token}"`)).toHaveLength(0)
  })
})
