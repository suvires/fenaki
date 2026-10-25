import { describe, expect, it } from 'vitest'
import { isOptOut, matchReply, parseIds, type MatchContext } from '../src/crm/inbox/match.ts'
import { stripQuoted } from '../src/crm/inbox/strip.ts'

const context: MatchContext = {
  ownAddresses: new Set(['hola@example.org']),
  outbound: new Map([
    ['abc@example.org', { organization: 1, contact: 10 }],
    ['def@example.org', { organization: 2, contact: 20 }],
  ]),
  contacts: new Map([
    ['ana@festival.example', { id: 10, organization: 1 }],
    ['luis@escuela.example', { id: 30, organization: 3 }],
  ]),
}

describe('matchReply', () => {
  it('matches a reply by In-Reply-To', () => {
    expect(
      matchReply(
        {
          messageId: '<r1@x>',
          inReplyTo: '<ABC@example.org>',
          fromAddress: 'ana@festival.example',
        },
        context,
      ),
    ).toEqual({ kind: 'thread', organization: 1, contact: 10, viaMessageId: 'abc@example.org' })
  })

  it('matches by References when In-Reply-To is missing, nearest ancestor first', () => {
    const match = matchReply(
      {
        references: ['<abc@example.org> <zzz@other> <def@example.org>'],
        fromAddress: 'x@y.example',
      },
      context,
    )
    expect(match).toMatchObject({ kind: 'thread', organization: 2, contact: 20 })
  })

  it('uses the sender as the contact when a colleague answers in the thread', () => {
    expect(
      matchReply({ inReplyTo: '<abc@example.org>', fromAddress: 'LUIS@escuela.example' }, context),
    ).toMatchObject({ kind: 'thread', organization: 1, contact: 30 })
  })

  it('matches a contact that writes without replying to anything', () => {
    expect(matchReply({ fromAddress: 'Ana@Festival.example' }, context)).toEqual({
      kind: 'sender',
      organization: 1,
      contact: 10,
    })
  })

  it('ignores everything else: AWS, access codes, newsletters', () => {
    for (const fromAddress of [
      'no-reply@sns.amazonaws.com',
      'noreply@cloudflareaccess.com',
      'news@shop.example',
    ])
      expect(matchReply({ messageId: '<q@z>', fromAddress }, context)).toEqual({
        kind: 'ignore',
        reason: 'no-match',
      })
  })

  it('ignores copies of our own mail, even inside a thread', () => {
    expect(
      matchReply(
        {
          messageId: '<abc@example.org>',
          inReplyTo: '<def@example.org>',
          fromAddress: 'hola@example.org',
        },
        context,
      ),
    ).toEqual({ kind: 'ignore', reason: 'own-message' })
    expect(
      matchReply(
        {
          messageId: '<new@x>',
          references: ['<abc@example.org>'],
          fromAddress: 'HOLA@example.org',
        },
        context,
      ),
    ).toEqual({ kind: 'ignore', reason: 'own-message' })
  })

  it('ignores bounce notices from the mail system', () => {
    expect(
      matchReply(
        { inReplyTo: '<abc@example.org>', fromAddress: 'MAILER-DAEMON@mx.example' },
        context,
      ),
    ).toEqual({ kind: 'ignore', reason: 'automated' })
  })
})

describe('parseIds', () => {
  it('extracts and normalizes every <id>', () => {
    expect(parseIds('<A@x> junk <b@Y>')).toEqual(['a@x', 'b@y'])
    expect(parseIds(undefined)).toEqual([])
  })
})

describe('isOptOut', () => {
  it('recognises «no» and its usual forms', () => {
    for (const text of [
      'no',
      'No.',
      ' NO \n\nsaludos',
      'No, gracias',
      'baja',
      'Stop',
      'Unsubscribe',
    ])
      expect(isOptOut(text), text).toBe(true)
  })
  it('does not take a longer answer for an opt-out', () => {
    for (const text of ['No sé si encaja, ¿me cuentas más?', 'Sí, me interesa', 'Nos encanta', ''])
      expect(isOptOut(text), text).toBe(false)
  })
})

describe('stripQuoted', () => {
  it('drops English and Spanish quoted history', () => {
    expect(
      stripQuoted(
        'Gracias, nos interesa.\n\nOn Mon, 2 Nov 2026 at 10:00, Fenaki <hola@x.org> wrote:\n> Hola\n> ...',
      ),
    ).toBe('Gracias, nos interesa.')
    expect(
      stripQuoted(
        'Perfecto.\n\nEl lun, 2 nov 2026 a las 10:00, Fenaki <hola@x.org>\nescribió:\n> Hola',
      ),
    ).toBe('Perfecto.')
  })

  it('drops Outlook headers and ">" lines', () => {
    expect(stripQuoted('Vale\n\nDe: Fenaki\nEnviado: lunes\nPara: yo\nAsunto: Hola\n\nHola')).toBe(
      'Vale',
    )
    expect(stripQuoted('Línea\n> citada\nOtra')).toBe('Línea\nOtra')
  })

  it('keeps the whole text when it is all quoted, and caps the size', () => {
    expect(stripQuoted('> solo cita')).toBe('> solo cita')
    expect(stripQuoted('a'.repeat(50), 10)).toBe(`${'a'.repeat(10)}…`)
  })

  it('removes control characters', () => {
    expect(stripQuoted('ho\u0000la\u0007')).toBe('hola')
  })
})
