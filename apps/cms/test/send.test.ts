/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known to exist */
import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { CrmError } from '../src/crm/errors.ts'
import { sendApprovedMessage } from '../src/crm/send.ts'

const env = {
  MAILBOX_USER: 'hola@fenaki.tv',
  MAILBOX_PASSWORD: 'secret',
  MAILBOX_IMAP_HOST: 'imap.test',
  MAILBOX_SMTP_HOST: 'smtp.test',
  WEB_URL: 'https://fenaki.tv',
}
const admin = { id: 1, role: 'admin' as const }
const agent = { id: 2, role: 'agent' as const }

interface World {
  message?: Record<string, unknown>
  contact?: Record<string, unknown>
  sentToday?: number
}

/** An in-memory stand-in for the parts of Payload the send action uses. */
function fake(world: World = {}) {
  const docs: Record<string, Record<number, Record<string, unknown>>> = {
    messages: {
      10: {
        id: 10,
        direction: 'outbound',
        status: 'approved',
        subject: 'Propuesta',
        body: 'Hola',
        organization: 5,
        contact: 6,
        approvedBy: 1,
        approvedAt: '2026-11-02T09:00:00Z',
        ...world.message,
      },
    },
    contacts: {
      6: {
        id: 6,
        email: 'ana@festival.example',
        name: 'Ana',
        organization: 5,
        doNotContact: false,
        ...world.contact,
      },
    },
    organizations: { 5: { id: 5, status: 'to_contact' } },
    users: { 1: { id: 1, role: 'admin' }, 2: { id: 2, role: 'agent' } },
  }
  const updates: { collection: string; id: number; data: Record<string, unknown> }[] = []
  const payload = {
    findByID: async ({ collection, id }: { collection: string; id: number }) => {
      const doc = docs[collection]?.[id]
      if (!doc) throw new Error('not found')
      return doc
    },
    count: async () => ({ totalDocs: world.sentToday ?? 0 }),
    update: async ({
      collection,
      id,
      data,
    }: {
      collection: string
      id: number
      data: Record<string, unknown>
    }) => {
      updates.push({ collection, id, data })
      Object.assign(docs[collection]![id]!, data)
      return docs[collection]![id]
    },
  } as unknown as Payload
  return { payload, docs, updates }
}

const NOW = new Date('2026-11-02T10:00:00Z')

describe('sendApprovedMessage', () => {
  it('sends an approved message and updates the message and the organization', async () => {
    const { payload, docs } = fake()
    const sendMail = vi.fn(async () => ({}))
    const appendToSent = vi.fn(async () => {})
    const result = await sendApprovedMessage(10, {
      payload,
      user: admin,
      env,
      now: NOW,
      transport: { sendMail },
      appendToSent,
    })

    expect(sendMail).toHaveBeenCalledOnce()
    const call = sendMail.mock.calls[0] as unknown as [
      { envelope: { from: string; to: string[] }; raw: Buffer },
    ]
    expect(call[0].envelope).toEqual({ from: 'hola@fenaki.tv', to: ['ana@festival.example'] })
    const raw = call[0].raw.toString()
    expect(raw).toContain(`Message-ID: ${result.messageId}`)
    expect(raw).toContain('Reply-To: hola@fenaki.tv')
    expect(raw).not.toMatch(/^bcc:/im)
    expect(raw).toContain('privacidad')
    // The same bytes go to the Sent folder.
    expect(appendToSent).toHaveBeenCalledWith(expect.anything(), call[0].raw, NOW)

    expect(docs.messages![10]).toMatchObject({
      status: 'sent',
      messageId: result.messageId,
      sentAt: NOW.toISOString(),
      followUpDate: '2026-11-09T10:00:00.000Z',
    })
    expect(docs.organizations![5]).toMatchObject({
      status: 'contacted',
      lastContactDate: NOW.toISOString(),
      nextFollowUpDate: '2026-11-09T10:00:00.000Z',
    })
  })

  it('keeps a pipeline stage that is already past «contacted»', async () => {
    const { payload, docs } = fake()
    docs.organizations![5]!.status = 'negotiation'
    await sendApprovedMessage(10, {
      payload,
      user: admin,
      env,
      now: NOW,
      transport: { sendMail: vi.fn() },
      appendToSent: async () => {},
    })
    expect(docs.organizations![5]!.status).toBe('negotiation')
  })

  it('uses the follow-up date the admin chose', async () => {
    const { payload, docs } = fake({ message: { followUpDate: '2026-11-20T00:00:00.000Z' } })
    await sendApprovedMessage(10, {
      payload,
      user: admin,
      env,
      now: NOW,
      transport: { sendMail: vi.fn() },
      appendToSent: async () => {},
    })
    expect(docs.organizations![5]!.nextFollowUpDate).toBe('2026-11-20T00:00:00.000Z')
  })

  it('threads a reply under the message it answers', async () => {
    const { payload, docs } = fake({ message: { replyingTo: 11 } })
    docs.messages![11] = {
      id: 11,
      messageId: '<in@festival.example>',
      references: '<out@fenaki.tv>',
    }
    const sendMail = vi.fn()
    await sendApprovedMessage(10, {
      payload,
      user: admin,
      env,
      now: NOW,
      transport: { sendMail },
      appendToSent: async () => {},
    })
    const raw = (sendMail.mock.calls[0] as unknown as [{ raw: Buffer }])[0].raw.toString()
    expect(raw).toContain('In-Reply-To: <in@festival.example>')
    expect(raw).toContain('References: <out@fenaki.tv> <in@festival.example>')
  })

  it('refuses an agent, whatever the message says', async () => {
    const { payload, updates } = fake()
    const sendMail = vi.fn()
    await expect(
      sendApprovedMessage(10, { payload, user: agent, env, transport: { sendMail } }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    await expect(
      sendApprovedMessage(10, { payload, user: null, env, transport: { sendMail } }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(sendMail).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it('refuses a message that is not approved', async () => {
    for (const message of [{ status: 'draft' }, { status: 'sent' }, { approvedBy: null }]) {
      const { payload } = fake({ message })
      const sendMail = vi.fn()
      await expect(
        sendApprovedMessage(10, { payload, user: admin, env, transport: { sendMail } }),
      ).rejects.toMatchObject({ code: 'notApproved' })
      expect(sendMail).not.toHaveBeenCalled()
    }
  })

  it('refuses a message whose approver is not an admin', async () => {
    const { payload } = fake({ message: { approvedBy: 2 } })
    await expect(
      sendApprovedMessage(10, { payload, user: admin, env, transport: { sendMail: vi.fn() } }),
    ).rejects.toMatchObject({ code: 'notApproved' })
  })

  it('refuses a contact marked «do not contact»', async () => {
    const { payload, updates } = fake({ contact: { doNotContact: true } })
    const sendMail = vi.fn()
    await expect(
      sendApprovedMessage(10, { payload, user: admin, env, transport: { sendMail } }),
    ).rejects.toMatchObject({ code: 'doNotContact' })
    expect(sendMail).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it('refuses a contact from another organization', async () => {
    const { payload } = fake({ contact: { organization: 99 } })
    await expect(
      sendApprovedMessage(10, { payload, user: admin, env, transport: { sendMail: vi.fn() } }),
    ).rejects.toMatchObject({ code: 'contactOrganization' })
  })

  it('stops at the daily limit', async () => {
    const { payload } = fake({ sentToday: 20 })
    const sendMail = vi.fn()
    await expect(
      sendApprovedMessage(10, { payload, user: admin, env, transport: { sendMail } }),
    ).rejects.toMatchObject({ code: 'dailyLimit', status: 429 })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('sends the last one under a custom limit', async () => {
    const options = {
      user: admin,
      now: NOW,
      transport: { sendMail: vi.fn() },
      appendToSent: async () => {},
    }
    await expect(
      sendApprovedMessage(10, {
        ...options,
        payload: fake({ sentToday: 2 }).payload,
        env: { ...env, CRM_DAILY_SEND_LIMIT: '3' },
      }),
    ).resolves.toBeDefined()
    await expect(
      sendApprovedMessage(10, {
        ...options,
        payload: fake({ sentToday: 2 }).payload,
        env: { ...env, CRM_DAILY_SEND_LIMIT: '2' },
      }),
    ).rejects.toMatchObject({ code: 'dailyLimit' })
  })

  it('refuses to send without the mailbox settings', async () => {
    const { payload } = fake()
    await expect(sendApprovedMessage(10, { payload, user: admin, env: {} })).rejects.toMatchObject({
      code: 'notConfigured',
    })
  })

  it('marks the message failed when the server refuses it, and can be tried again', async () => {
    const { payload, docs } = fake()
    const sendMail = vi
      .fn()
      .mockRejectedValueOnce(new Error('550 mailbox unavailable'))
      .mockResolvedValue({})
    await expect(
      sendApprovedMessage(10, {
        payload,
        user: admin,
        env,
        now: NOW,
        transport: { sendMail },
        appendToSent: async () => {},
      }),
    ).rejects.toBeInstanceOf(CrmError)
    expect(docs.messages![10]).toMatchObject({ status: 'failed', sentAt: null })
    expect(String(docs.messages![10]!.error)).toContain('550')
    expect(docs.organizations![5]!.status).toBe('to_contact')
  })

  it('does not send twice at once', async () => {
    const { payload } = fake()
    let release: () => void = () => {}
    const sendMail = vi.fn(() => new Promise<object>((resolve) => (release = () => resolve({}))))
    const first = sendApprovedMessage(10, {
      payload,
      user: admin,
      env,
      now: NOW,
      transport: { sendMail },
      appendToSent: async () => {},
    })
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalled())
    await expect(
      sendApprovedMessage(10, { payload, user: admin, env, transport: { sendMail } }),
    ).rejects.toMatchObject({ code: 'busy' })
    release()
    await first
  })

  it('reports, but survives, a Sent folder that cannot be written', async () => {
    const { payload, docs } = fake()
    const result = await sendApprovedMessage(10, {
      payload,
      user: admin,
      env,
      now: NOW,
      transport: { sendMail: vi.fn() },
      appendToSent: async () => {
        throw new Error('no Sent folder')
      },
    })
    expect(result.sentCopyError).toBe('no Sent folder')
    expect(docs.messages![10]).toMatchObject({ status: 'sent' })
    expect(String(docs.messages![10]!.error)).toContain('no Sent folder')
  })
})
