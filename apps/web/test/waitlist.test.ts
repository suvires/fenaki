import { describe, expect, it } from 'vitest'
import { confirmationEmail } from '../src/lib/confirmation-email.ts'
import type { Listmonk, ListmonkList, ListmonkSubscriber } from '../src/lib/listmonk.ts'
import { createRateLimit } from '../src/lib/rate-limit.ts'
import { isHiddenInMode } from '../src/lib/site-mode.ts'
import {
  checkEmail,
  confirm,
  confirmationUrl,
  LINK_TTL_MS,
  LIST_TAGS,
  RESEND_INTERVAL_MS,
  subscribe,
} from '../src/lib/waitlist.ts'

const NOW = Date.parse('2026-10-25T12:00:00Z')
const LAUNCH: ListmonkList = {
  id: 3,
  uuid: 'launch-uuid',
  name: 'Lanzamiento',
  tags: [LIST_TAGS.launch],
}
const WEEKLY: ListmonkList = {
  id: 4,
  uuid: 'weekly-uuid',
  name: 'Semanal',
  tags: [LIST_TAGS.weekly],
}
const UUID = '83c21589-0190-4785-935f-5b6e9e52b649'

/** An in-memory listmonk with the calls the waitlist makes. */
function fakeListmonk(existing?: ListmonkSubscriber) {
  let subscriber = existing
  const sent: Record<string, string>[] = []
  const confirmed: string[][] = []
  const client = {
    listsByTag: async (tag: string) => [LAUNCH, WEEKLY].filter((l) => l.tags.includes(tag)),
    subscriberByEmail: async () => subscriber,
    subscriberByUuid: async (uuid: string) => (subscriber?.uuid === uuid ? subscriber : undefined),
    createSubscriber: async (data: { email: string; lists: number[] }) => {
      subscriber = {
        id: 1,
        uuid: UUID,
        email: data.email,
        name: 'ana',
        status: 'enabled',
        attribs: {},
        lists: data.lists.map((id) => ({
          id,
          uuid: id === LAUNCH.id ? LAUNCH.uuid : WEEKLY.uuid,
          subscription_status: 'unconfirmed' as const,
          subscription_created_at: new Date(NOW).toISOString(),
        })),
      }
      return subscriber
    },
    addToLists: async (_id: number, ids: number[]) => {
      for (const id of ids)
        subscriber?.lists.push({
          id,
          uuid: id === LAUNCH.id ? LAUNCH.uuid : WEEKLY.uuid,
          subscription_status: 'unconfirmed',
          subscription_created_at: new Date(NOW).toISOString(),
        })
      return true
    },
    updateAttribs: async (_s: ListmonkSubscriber, attribs: Record<string, unknown>) => {
      if (subscriber) subscriber.attribs = attribs
      return subscriber
    },
    templateByName: async (name: string) => ({ id: 9, name, type: 'tx' }),
    sendTransactional: async (message: { data: Record<string, string> }) => {
      sent.push(message.data)
      return true
    },
    confirmOptin: async (_uuid: string, lists: string[]) => {
      confirmed.push(lists)
      for (const list of subscriber?.lists ?? [])
        if (lists.includes(list.uuid)) list.subscription_status = 'confirmed'
    },
  }
  return { client: client as unknown as Listmonk, sent, confirmed, get: () => subscriber }
}

const input = { email: 'ana@ejemplo.com', locale: 'es' as const, siteUrl: 'https://shortix.film' }

describe('checkEmail', () => {
  it('tells an empty field from an incomplete address', () => {
    expect(checkEmail('  ')).toEqual({ ok: false, error: 'empty' })
    expect(checkEmail('ana@ejemplo')).toEqual({ ok: false, error: 'invalid' })
    expect(checkEmail("ana'@ejemplo.com")).toEqual({ ok: false, error: 'invalid' })
    expect(checkEmail(' ana@ejemplo.com ')).toEqual({ ok: true, email: 'ana@ejemplo.com' })
  })
})

describe('subscribe', () => {
  it('subscribes to the launch list unconfirmed and sends the confirmation link', async () => {
    const fake = fakeListmonk()
    await subscribe(fake.client, { ...input, newsletter: false, now: NOW })
    expect(fake.get()?.lists.map((l) => l.id)).toEqual([LAUNCH.id])
    expect(fake.sent).toEqual([
      {
        confirm_url: `https://shortix.film/es/lista-de-espera/confirmar?s=${UUID}`,
        site_url: 'https://shortix.film/es/',
      },
    ])
  })

  it('adds the weekly list when asked, and does not resend within the interval', async () => {
    const fake = fakeListmonk()
    await subscribe(fake.client, { ...input, newsletter: false, now: NOW })
    await subscribe(fake.client, { ...input, newsletter: true, now: NOW + 1000 })
    expect(fake.get()?.lists.map((l) => l.id)).toEqual([LAUNCH.id, WEEKLY.id])
    expect(fake.sent).toHaveLength(1)
    await subscribe(fake.client, { ...input, newsletter: true, now: NOW + RESEND_INTERVAL_MS + 1 })
    expect(fake.sent).toHaveLength(2)
  })

  it('sends nothing to blocklisted or already confirmed addresses', async () => {
    const fake = fakeListmonk()
    await subscribe(fake.client, { ...input, newsletter: false, now: NOW })
    await confirm(fake.client, { subscriberUuid: UUID, now: NOW })
    await subscribe(fake.client, { ...input, newsletter: false, now: NOW + LINK_TTL_MS })
    expect(fake.sent).toHaveLength(1)
  })
})

describe('confirm', () => {
  it('confirms the pending lists once, then the link no longer works', async () => {
    const fake = fakeListmonk()
    await subscribe(fake.client, { ...input, newsletter: true, now: NOW })
    expect(await confirm(fake.client, { subscriberUuid: UUID, now: NOW })).toEqual({
      status: 'confirmed',
      newsletter: true,
    })
    expect(fake.confirmed).toEqual([[LAUNCH.uuid, WEEKLY.uuid]])
    expect(await confirm(fake.client, { subscriberUuid: UUID, now: NOW })).toEqual({
      status: 'expired',
    })
  })

  it('expires 7 days after the last confirmation email', async () => {
    const fake = fakeListmonk()
    await subscribe(fake.client, { ...input, newsletter: false, now: NOW })
    expect(
      await confirm(fake.client, { subscriberUuid: UUID, now: NOW + LINK_TTL_MS + 1 }),
    ).toEqual({ status: 'expired' })
  })

  it('rejects anything that is not a UUID without asking listmonk', async () => {
    expect(await confirm(fakeListmonk().client, { subscriberUuid: "x' OR 1=1" })).toEqual({
      status: 'expired',
    })
  })
})

describe('confirmationUrl', () => {
  it('is locale-prefixed', () => {
    expect(confirmationUrl('http://localhost:4321', 'es', UUID)).toBe(
      `http://localhost:4321/es/lista-de-espera/confirmar?s=${UUID}`,
    )
  })
})

describe('confirmationEmail', () => {
  it('uses the locale copy and leaves the link to listmonk', () => {
    const { subject, body } = confirmationEmail('es')
    expect(subject).toBe('Confirma tu correo para la lista de Shortix')
    expect(body).toContain('Confirmar mi correo')
    expect(body).toContain('href="{{ .Tx.Data.confirm_url }}"')
    expect(body).toContain('{{ .Tx.Data.site_url }}privacidad')
    expect(body).not.toMatch(/\{(legalNotice|privacyPolicy|url)\}/)
  })
})

describe('isHiddenInMode', () => {
  it('hides only the catalog routes, and only before launch', () => {
    for (const path of ['/es/cortos/cuerdas', '/es/colecciones/x', '/es/buscar', '/api/search'])
      expect(isHiddenInMode(path, 'landing')).toBe(true)
    for (const path of [
      '/es/',
      '/es/aviso-legal',
      '/es/lista-de-espera/confirmar',
      '/api/waitlist',
    ])
      expect(isHiddenInMode(path, 'landing')).toBe(false)
    expect(isHiddenInMode('/es/cortos/cuerdas', 'catalog')).toBe(false)
  })
})

describe('createRateLimit', () => {
  it('allows a number of requests per window and key', () => {
    const allow = createRateLimit(2, 1000)
    expect([allow('a', 0), allow('a', 1), allow('a', 2), allow('b', 2)]).toEqual([
      true,
      true,
      false,
      true,
    ])
    expect(allow('a', 1001)).toBe(true)
  })
})
