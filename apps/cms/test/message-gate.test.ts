import { describe, expect, it } from 'vitest'
import { checkMessageWrite, type MessageState } from '../src/crm/messageGate.ts'

const NOW = new Date('2026-11-02T10:00:00Z')
const draft: MessageState = {
  direction: 'outbound',
  status: 'draft',
  subject: 'Hola',
  body: 'Texto',
  organization: 1,
  contact: 2,
}
const write = (input: Parameters<typeof checkMessageWrite>[0]) =>
  checkMessageWrite({ now: NOW, userId: 7, ...input })

describe('the approval gate: agent', () => {
  it('creates outbound drafts', () => {
    const result = write({ actor: 'agent', operation: 'create', data: draft })
    expect(result).toMatchObject({ ok: true, data: { status: 'draft' } })
  })

  it('cannot create an approved or sent message', () => {
    for (const status of ['approved', 'sending', 'sent', 'failed'] as const)
      expect(write({ actor: 'agent', operation: 'create', data: { ...draft, status } })).toEqual({
        ok: false,
        error: 'agent-cannot-approve',
      })
  })

  it('cannot approve a draft', () => {
    expect(
      write({ actor: 'agent', operation: 'update', original: draft, data: { status: 'approved' } }),
    ).toEqual({ ok: false, error: 'agent-cannot-approve' })
  })

  it('cannot edit a message once it is approved', () => {
    expect(
      write({
        actor: 'agent',
        operation: 'update',
        original: { ...draft, status: 'approved' },
        data: { body: 'Otro' },
      }),
    ).toEqual({ ok: false, error: 'agent-only-drafts' })
  })

  it('cannot pass itself off as the approver', () => {
    const result = write({
      actor: 'agent',
      operation: 'update',
      original: draft,
      data: { body: 'Más texto', approvedBy: 1, approvedAt: '2026-01-01T00:00:00Z' },
    })
    expect(result).toMatchObject({ ok: true, data: { status: 'draft', approvedBy: undefined } })
  })

  it('cannot create received messages, but can mark one as handled', () => {
    expect(
      write({
        actor: 'agent',
        operation: 'create',
        data: { ...draft, direction: 'inbound', status: 'received' },
      }),
    ).toEqual({ ok: false, error: 'agent-only-handled' })
    const received = { ...draft, direction: 'inbound', status: 'received' } as MessageState
    expect(
      write({ actor: 'agent', operation: 'update', original: received, data: { handled: true } }),
    ).toMatchObject({ ok: true })
    expect(
      write({ actor: 'agent', operation: 'update', original: received, data: { body: 'x' } }),
    ).toEqual({ ok: false, error: 'locked' })
  })
})

describe('the approval gate: admin', () => {
  it('approves a draft and records who and when', () => {
    expect(
      write({ actor: 'admin', operation: 'update', original: draft, data: { status: 'approved' } }),
    ).toMatchObject({
      ok: true,
      data: { status: 'approved', approvedBy: 7, approvedAt: NOW.toISOString() },
    })
  })

  it('cannot mark a message as sent: only the send action does', () => {
    for (const status of ['sent', 'sending', 'failed'] as const)
      expect(
        write({
          actor: 'admin',
          operation: 'update',
          original: { ...draft, status: 'approved' },
          data: { status },
        }),
      ).toEqual({ ok: false, error: 'invalid-transition' })
  })

  it('takes the approval back when the text of an approved message changes', () => {
    const approved = {
      ...draft,
      status: 'approved',
      approvedBy: 7,
      approvedAt: 'x',
    } as MessageState
    expect(
      write({ actor: 'admin', operation: 'update', original: approved, data: { body: 'Nuevo' } }),
    ).toMatchObject({ ok: true, data: { status: 'draft', approvedBy: null, approvedAt: null } })
    expect(
      write({
        actor: 'admin',
        operation: 'update',
        original: approved,
        data: { followUpDate: 'd' },
      }),
    ).toMatchObject({ ok: true, data: { status: 'approved', approvedBy: 7 } })
  })

  it('can re-approve a failed message', () => {
    expect(
      write({
        actor: 'admin',
        operation: 'update',
        original: { ...draft, status: 'failed' },
        data: { status: 'approved' },
      }),
    ).toMatchObject({ ok: true, data: { status: 'approved', approvedBy: 7 } })
  })

  it('cannot edit a sent message', () => {
    expect(
      write({
        actor: 'admin',
        operation: 'update',
        original: { ...draft, status: 'sent' },
        data: { body: 'x' },
      }),
    ).toEqual({ ok: false, error: 'locked' })
  })

  it('logs a received message by hand, with status received', () => {
    expect(
      write({
        actor: 'admin',
        operation: 'create',
        data: { ...draft, direction: 'inbound', status: 'received' },
      }),
    ).toMatchObject({ ok: true })
    expect(
      write({
        actor: 'admin',
        operation: 'create',
        data: { ...draft, direction: 'inbound', status: 'draft' },
      }),
    ).toEqual({ ok: false, error: 'inbound-status' })
  })

  it('discards fields only the system may set', () => {
    const result = write({
      actor: 'admin',
      operation: 'create',
      data: { ...draft, messageId: '<x@y>', sentAt: '2026-01-01T00:00:00Z' },
    })
    expect(result).toMatchObject({ ok: true, data: { messageId: undefined, sentAt: undefined } })
  })
})

describe('the approval gate: system and anonymous', () => {
  it('lets the system through unchanged', () => {
    const data = { status: 'sent' } as MessageState
    expect(write({ actor: 'system', operation: 'update', original: draft, data })).toEqual({
      ok: true,
      data,
    })
  })

  it('refuses anyone else', () => {
    expect(write({ actor: 'anonymous', operation: 'create', data: draft })).toEqual({
      ok: false,
      error: 'anonymous',
    })
  })
})
