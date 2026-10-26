import { describe, expect, it } from 'vitest'
import type { Listmonk, ListmonkList, ListmonkSubscriber } from '../src/listmonk.ts'
import {
  checkEmail,
  confirm,
  confirmationUrl,
  LINK_TTL_MS,
  LIST_TAGS,
  purgeExpired,
  RESEND_INTERVAL_MS,
  subscribe,
} from '../src/waitlist.ts'

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
    unconfirmedOn: async () =>
      subscriber?.lists.some((l) => l.subscription_status === 'unconfirmed') ? [subscriber] : [],
    removeFromLists: async (_id: number, ids: number[]) => {
      if (subscriber) subscriber.lists = subscriber.lists.filter((l) => !ids.includes(l.id))
      return true
    },
    deleteSubscriber: async () => {
      subscriber = undefined
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

const input = { email: 'ana@ejemplo.com', locale: 'es' as const, siteUrl: 'https://fenaki.tv' }

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
        confirm_url: `https://fenaki.tv/es/lista-de-espera/confirmar?s=${UUID}`,
        site_url: 'https://fenaki.tv/es/',
        logo_url: 'https://fenaki.tv/email/logo.png',
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

describe('purgeExpired', () => {
  it('keeps signups whose link still works', async () => {
    const fake = fakeListmonk()
    await subscribe(fake.client, { ...input, newsletter: false, now: NOW })
    expect(await purgeExpired(fake.client, NOW + LINK_TTL_MS)).toEqual({
      deleted: 0,
      unsubscribed: 0,
    })
    expect(fake.get()).toBeDefined()
  })

  it('deletes a subscriber that never confirmed, once the link expired', async () => {
    const fake = fakeListmonk()
    await subscribe(fake.client, { ...input, newsletter: true, now: NOW })
    expect(await purgeExpired(fake.client, NOW + LINK_TTL_MS + 1)).toEqual({
      deleted: 1,
      unsubscribed: 0,
    })
    expect(fake.get()).toBeUndefined()
  })

  it('only drops the expired list when another one is confirmed', async () => {
    const fake = fakeListmonk()
    await subscribe(fake.client, { ...input, newsletter: false, now: NOW })
    await confirm(fake.client, { subscriberUuid: UUID, now: NOW })
    await subscribe(fake.client, { ...input, newsletter: true, now: NOW + RESEND_INTERVAL_MS })
    expect(await purgeExpired(fake.client, NOW + 2 * LINK_TTL_MS)).toEqual({
      deleted: 0,
      unsubscribed: 1,
    })
    expect(fake.get()?.lists.map((l) => [l.id, l.subscription_status])).toEqual([
      [LAUNCH.id, 'confirmed'],
    ])
  })
})
