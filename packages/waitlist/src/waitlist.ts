/**
 * The waitlist, on listmonk with double opt-in. listmonk keeps every subscription unconfirmed
 * until the subscriber opens the link in the confirmation email, which the web app sends through
 * listmonk with its own copy (packages/i18n). Nothing about subscribers is stored here.
 */
import type { Locale } from '@shortix/i18n'
import type { Listmonk, ListmonkList, ListmonkSubscriber } from './listmonk.ts'

/** listmonk list tags: the setup script creates the lists, the web app finds them by tag. */
export const LIST_TAGS = { launch: 'shortix-launch', weekly: 'shortix-weekly' } as const

export const confirmationTemplateName = (locale: Locale) => `shortix-waitlist-confirm-${locale}`

/**
 * When the weekly selection goes out: Friday morning, Spanish time, ready for the weekend. The
 * confirmation page announces the day; the newsletter campaigns are scheduled at this time.
 */
export const NEWSLETTER_SCHEDULE = {
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  weekday: 5,
  time: '09:00',
  timeZone: 'Europe/Madrid',
} as const

/** How long a confirmation link works («El enlace caduca en 7 días»). */
export const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** A second confirmation email for the same address is sent at most this often. */
export const RESEND_INTERVAL_MS = 60 * 1000

/** Subscriber attribute with the time of the last confirmation email (ISO 8601). */
const SENT_AT = 'shortix_confirmation_sent_at'

export type EmailCheck = { ok: true; email: string } | { ok: false; error: 'empty' | 'invalid' }

/** A local part, @, and a domain with at least one dot. No spaces, quotes or angle brackets. */
const EMAIL = /^[^\s@"'<>()]+@[^\s@"'<>()]+\.[^\s@"'<>()]{2,}$/

export function checkEmail(raw: unknown): EmailCheck {
  const email = typeof raw === 'string' ? raw.trim() : ''
  if (!email) return { ok: false, error: 'empty' }
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, error: 'invalid' }
  return { ok: true, email }
}

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

async function waitlistLists(client: Listmonk) {
  const [launch, weekly] = await Promise.all([
    client.listsByTag(LIST_TAGS.launch),
    client.listsByTag(LIST_TAGS.weekly),
  ])
  if (!launch[0] || !weekly[0])
    throw new Error('The waitlist lists are missing in listmonk: run `pnpm setup:services`')
  return { launch: launch[0], weekly: weekly[0] }
}

export function confirmationUrl(siteUrl: string, locale: Locale, subscriberUuid: string): string {
  const url = new URL(`/${locale}/lista-de-espera/confirmar`, siteUrl)
  url.searchParams.set('s', subscriberUuid)
  return url.toString()
}

const sentAt = (subscriber: ListmonkSubscriber) => {
  const value = subscriber.attribs[SENT_AT]
  return typeof value === 'string' ? Date.parse(value) : Number.NaN
}

export interface SubscribeInput {
  email: string
  /** Also the weekly selection, not only the launch notice. */
  newsletter: boolean
  locale: Locale
  siteUrl: string
  fromEmail?: string
  now?: number
}

/**
 * Adds the address to the launch list (and the weekly list if asked) as unconfirmed, then sends
 * the confirmation email. The answer is the same whether the address was new, pending or already
 * confirmed, so the form never reveals who is on the list.
 */
export async function subscribe(client: Listmonk, input: SubscribeInput): Promise<void> {
  const now = input.now ?? Date.now()
  const lists = await waitlistLists(client)
  const wanted: ListmonkList[] = input.newsletter ? [lists.launch, lists.weekly] : [lists.launch]

  let subscriber = await client.subscriberByEmail(input.email)
  if (!subscriber) {
    subscriber = await client.createSubscriber({
      email: input.email,
      lists: wanted.map((list) => list.id),
      attribs: { locale: input.locale, source: 'landing' },
    })
  } else {
    if (subscriber.status === 'blocklisted') return
    const current = new Set(subscriber.lists.map((list) => list.id))
    const missing = wanted.filter((list) => !current.has(list.id))
    if (missing.length > 0) {
      await client.addToLists(
        subscriber.id,
        missing.map((list) => list.id),
      )
      subscriber = (await client.subscriberByUuid(subscriber.uuid)) ?? subscriber
    }
  }

  const pending = subscriber.lists.some(
    (list) => wanted.some((w) => w.id === list.id) && list.subscription_status === 'unconfirmed',
  )
  if (!pending) return
  if (now - sentAt(subscriber) < RESEND_INTERVAL_MS) return

  const template = await client.templateByName(confirmationTemplateName(input.locale))
  if (!template)
    throw new Error('The confirmation email template is missing: run `pnpm setup:services`')
  await client.updateAttribs(subscriber, {
    ...subscriber.attribs,
    [SENT_AT]: new Date(now).toISOString(),
  })
  await client.sendTransactional({
    subscriberId: subscriber.id,
    templateId: template.id,
    fromEmail: input.fromEmail,
    data: {
      confirm_url: confirmationUrl(input.siteUrl, input.locale, subscriber.uuid),
      site_url: new URL(`/${input.locale}/`, input.siteUrl).toString(),
    },
  })
}

export type ConfirmResult = { status: 'confirmed'; newsletter: boolean } | { status: 'expired' }

/**
 * Confirms the pending waitlist subscriptions of the subscriber with this UUID. Links stop
 * working 7 days after the last confirmation email, and once used.
 */
export async function confirm(
  client: Listmonk,
  input: { subscriberUuid: string; clientIp?: string; now?: number },
): Promise<ConfirmResult> {
  const now = input.now ?? Date.now()
  if (!isUuid(input.subscriberUuid)) return { status: 'expired' }
  const subscriber = await client.subscriberByUuid(input.subscriberUuid)
  if (!subscriber || subscriber.status === 'blocklisted') return { status: 'expired' }

  const lists = await waitlistLists(client)
  const ours = new Map([lists.launch, lists.weekly].map((list) => [list.id, list]))
  const pending = subscriber.lists.filter(
    (list) => ours.has(list.id) && list.subscription_status === 'unconfirmed',
  )
  if (pending.length === 0) return { status: 'expired' }

  if (now > linkExpiresAt(subscriber, pending)) return { status: 'expired' }

  await client.confirmOptin(
    subscriber.uuid,
    pending.map((list) => list.uuid),
    input.clientIp,
  )
  return { status: 'confirmed', newsletter: pending.some((list) => list.id === lists.weekly.id) }
}

/** When the subscriber's current confirmation link stops working. */
function linkExpiresAt(
  subscriber: ListmonkSubscriber,
  pending: { subscription_created_at: string }[],
) {
  const sent = sentAt(subscriber)
  const issuedAt = Number.isNaN(sent)
    ? Math.max(...pending.map((list) => Date.parse(list.subscription_created_at)))
    : sent
  return issuedAt + LINK_TTL_MS
}

/**
 * Keeps the promise of the confirmation email: «sin confirmar, ... borraremos este correo de la
 * lista». Once a link has expired, the unconfirmed waitlist subscriptions are removed, and the
 * subscriber too when nothing else is confirmed. Runs daily as a job in the CMS worker.
 */
export async function purgeExpired(
  client: Listmonk,
  now = Date.now(),
): Promise<{ deleted: number; unsubscribed: number }> {
  const lists = await waitlistLists(client)
  const ours = new Set([lists.launch.id, lists.weekly.id])
  let deleted = 0
  let unsubscribed = 0
  for (const subscriber of await client.unconfirmedOn([...ours])) {
    const pending = subscriber.lists.filter(
      (list) => ours.has(list.id) && list.subscription_status === 'unconfirmed',
    )
    if (pending.length === 0 || now <= linkExpiresAt(subscriber, pending)) continue
    const keeps = subscriber.lists.some(
      (list) => !pending.includes(list) && list.subscription_status !== 'unsubscribed',
    )
    if (keeps) {
      await client.removeFromLists(
        subscriber.id,
        pending.map((list) => list.id),
      )
      unsubscribed += 1
    } else {
      await client.deleteSubscriber(subscriber.id)
      deleted += 1
    }
  }
  return { deleted, unsubscribed }
}
