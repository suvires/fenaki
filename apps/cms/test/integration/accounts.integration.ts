/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known to exist */
/**
 * Viewer accounts on real services: PostgreSQL (own database) and Mailpit as the outgoing SMTP
 * server. Sign-up and the verification email, who can read what, one row per member and short,
 * only published shorts, progress, and the erasure of everything when an account is deleted.
 */
import { getPayload, type Payload, type Where } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:8025'

Object.assign(process.env, {
  DATABASE_URL:
    process.env.E2E_ACCOUNTS_DATABASE_URL ??
    'postgres://fenaki:fenaki@127.0.0.1:5432/fenaki_accounts_test',
  PAYLOAD_SECRET: 'integration-test-secret-integration-test-secret',
  PAYLOAD_PUBLIC_SERVER_URL: 'http://localhost:3198',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  SMTP_TLS: 'none',
  WEB_URL: 'https://fenaki.tv',
  SEARCH_INDEX_PREFIX: 'accounts_test_',
})

const { default: config } = await import('../../src/payload.config.ts')
const { resendVerification } = await import('../../src/accounts/resendVerification.ts')

const token = Math.random().toString(36).slice(2, 8)
const PASSWORD = 'a-long-password-1'

let payload: Payload
let published: number
let draft: number
const created: { collection: 'members' | 'shorts'; id: number }[] = []

type Viewer = { id: number }
/** Runs a call as that viewer, access control and hooks included, as the REST API does. */
const asMember = (member: Viewer) => ({
  user: { ...member, collection: 'members' as const },
  overrideAccess: false as const,
})
/** Creates a row of the viewer's collections as that viewer (the data is not typed: they may send anything). */
type Owned = 'list-items' | 'ratings' | 'viewings'
const rowAs = (member: Viewer, collection: Owned, data: Record<string, unknown>) =>
  payload.create({ collection, data: data as never, ...asMember(member) })
const asAdmin = (admin: Viewer) => ({
  user: { ...admin, collection: 'users' as const, role: 'admin' as const },
  overrideAccess: false as const,
})

async function mailTo(address: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
    )
    const { messages } = (await search.json()) as { messages: { ID: string; Subject: string }[] }
    if (messages[0]) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)
      const { HTML } = (await message.json()) as { HTML: string }
      return { subject: messages[0].Subject, html: HTML }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No email for ${address} in Mailpit`)
}

async function newMember(name: string) {
  const email = `accounts-test-${name}-${token}@example.org`
  const member = await payload.create({
    collection: 'members',
    data: { email, password: PASSWORD, _verified: true },
    disableVerificationEmail: true,
  })
  created.push({ collection: 'members', id: member.id })
  return { ...member, email }
}

async function newShort(title: string, status: 'published' | 'draft') {
  const short = await payload.create({
    collection: 'shorts',
    locale: 'es',
    data: {
      title: `${title} ${token}`,
      slug: `${title.toLowerCase()}-${token}`,
      durationSeconds: 600,
      year: 2020,
      country: 'ES',
      originalLanguage: 'es',
      type: 'fiction',
      status,
      sample: true,
    },
  })
  created.push({ collection: 'shorts', id: short.id })
  return short.id
}

beforeAll(async () => {
  payload = await getPayload({ config })
  await payload.db.migrate()
  published = await newShort('Publicado', 'published')
  draft = await newShort('Borrador', 'draft')
})

afterAll(async () => {
  for (const { collection, id } of created.toReversed())
    await payload.delete({ collection, id }).catch(() => {})
})

describe('sign-up and verification', () => {
  const email = `accounts-test-signup-${token}@example.org`

  it('sends a Spanish email whose link goes to the site, and keeps the account locked until verified', async () => {
    const member = await payload.create({
      collection: 'members',
      data: { email, password: PASSWORD, name: '  Ana  ' },
    })
    created.push({ collection: 'members', id: member.id })
    expect(member.name).toBe('Ana')

    const mail = await mailTo(email)
    expect(mail.subject).toBe('Verifica tu correo en FENAKI')
    const link = /href="(https:\/\/fenaki\.tv\/es\/cuenta\/verificar\?token=[^"]+)"/.exec(mail.html)
    expect(link).not.toBeNull()
    expect(mail.html).not.toContain('localhost:3198')

    await expect(
      payload.login({ collection: 'members', data: { email, password: PASSWORD } }),
    ).rejects.toThrow()

    const verifyToken = new URL(link![1]!).searchParams.get('token')!
    await payload.verifyEmail({ collection: 'members', token: verifyToken })
    const session = await payload.login({
      collection: 'members',
      data: { email, password: PASSWORD },
    })
    expect(session.token).toBeTruthy()
  })

  it('refuses short passwords and anything but email, password and name from a stranger', async () => {
    await expect(
      payload.create({
        collection: 'members',
        data: { email: `accounts-test-short-${token}@example.org`, password: 'corta' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const sneaky = await payload.create({
      collection: 'members',
      overrideAccess: false,
      disableVerificationEmail: true,
      data: {
        email: `accounts-test-sneaky-${token}@example.org`,
        password: PASSWORD,
        _verified: true,
        sample: true,
      },
    })
    created.push({ collection: 'members', id: sneaky.id })
    const stored = await payload.findByID({ collection: 'members', id: sneaky.id })
    expect(stored._verified).not.toBe(true)
    expect(stored.sample).toBe(false)
  })

  it('sends a new verification link to an unverified account, once a minute, and to nobody else', async () => {
    const email = `accounts-test-resend-${token}@example.org`
    const member = await payload.create({
      collection: 'members',
      data: { email, password: PASSWORD },
      disableVerificationEmail: true,
    })
    created.push({ collection: 'members', id: member.id })
    const later = Date.now() + 120_000
    expect(await resendVerification(payload, email, later)).toBe(true)
    const mail = await mailTo(email)
    expect(mail.html).toMatch(/https:\/\/fenaki\.tv\/es\/cuenta\/verificar\?token=/)
    // Right after, nothing again.
    expect(await resendVerification(payload, email, Date.now())).toBe(false)
    expect(await resendVerification(payload, `nobody-${token}@example.org`, later)).toBe(false)
    const verified = await newMember('resend-verified')
    expect(await resendVerification(payload, verified.email, later)).toBe(false)
  })

  it('sends the reset link to the site too', async () => {
    const member = await newMember('forgot')
    await payload.forgotPassword({
      collection: 'members',
      data: { email: member.email },
      disableEmail: false,
    })
    const mail = await mailTo(member.email)
    expect(mail.subject).toBe('Elige una contraseña nueva en FENAKI')
    expect(mail.html).toMatch(/https:\/\/fenaki\.tv\/es\/cuenta\/restablecer\?token=/)
  })
})

describe('who can read what', () => {
  it('lets a member read and change only themselves, and never the staff', async () => {
    const ana = await newMember('read-a')
    const luis = await newMember('read-b')

    const seen = await payload.find({ collection: 'members', ...asMember(ana) })
    expect(seen.docs.map((doc) => doc.id)).toEqual([ana.id])
    await expect(
      payload.update({
        collection: 'members',
        id: luis.id,
        data: { name: 'Hackeado' },
        ...asMember(ana),
      }),
    ).rejects.toThrow()

    await expect(payload.find({ collection: 'users', ...asMember(ana) })).rejects.toThrow()
  })

  it('does not let a member change their email or verification', async () => {
    const ana = await newMember('email')
    const updated = await payload.update({
      collection: 'members',
      id: ana.id,
      data: { email: `otro-${token}@example.org`, name: 'Ana', _verified: false },
      ...asMember(ana),
    })
    expect(updated.email).toBe(ana.email)
    expect(updated.name).toBe('Ana')
    const stored = await payload.findByID({ collection: 'members', id: ana.id })
    expect(stored._verified).toBe(true)
  })

  it('shows a member only published shorts and hides the rights notes', async () => {
    const ana = await newMember('catalog')
    const shorts = await payload.find({
      collection: 'shorts',
      where: { id: { in: [published, draft] } },
      ...asMember(ana),
    })
    expect(shorts.docs.map((doc) => doc.id)).toEqual([published])
    const licenses = await payload.find({ collection: 'licenses', ...asMember(ana) })
    expect(licenses.docs.every((doc) => doc.notes === undefined)).toBe(true)
  })
})

describe('list, ratings and viewings', () => {
  it('keeps one row per member and short, and only for the member who owns it', async () => {
    const ana = await newMember('list-a')
    const luis = await newMember('list-b')

    // The member field is theirs whatever they send.
    const item = await rowAs(ana, 'list-items', { member: luis.id, short: published })
    expect(typeof item.member === 'object' ? item.member.id : item.member).toBe(ana.id)

    await expect(rowAs(ana, 'list-items', { short: published })).rejects.toThrow()

    const others = await payload.find({ collection: 'list-items', ...asMember(luis) })
    expect(others.docs).toHaveLength(0)
    await expect(
      payload.delete({ collection: 'list-items', id: item.id, ...asMember(luis) }),
    ).rejects.toThrow()
  })

  it('refuses shorts that are not published', async () => {
    const ana = await newMember('draft')
    for (const collection of ['list-items', 'ratings', 'viewings'] as const)
      await expect(rowAs(ana, collection, { short: draft, value: 'like' })).rejects.toThrow()
  })

  it('rates once, and lets the member change the rating', async () => {
    const ana = await newMember('rating')
    const rating = await rowAs(ana, 'ratings', { short: published, value: 'like' })
    const changed = await payload.update({
      collection: 'ratings',
      id: rating.id,
      data: { value: 'love' },
      ...asMember(ana),
    })
    expect(changed.value).toBe('love')
    await expect(rowAs(ana, 'ratings', { short: published, value: 'dislike' })).rejects.toThrow()
  })

  it('decides «completed» itself, from 90 % of the duration', async () => {
    const ana = await newMember('viewing')
    const viewing = await rowAs(ana, 'viewings', {
      short: published,
      positionSeconds: 120,
      durationSeconds: 600,
      completed: true,
    })
    expect((viewing as { completed?: boolean }).completed).toBe(false)
    const finished = await payload.update({
      collection: 'viewings',
      id: viewing.id,
      data: { positionSeconds: 580, durationSeconds: 600 },
      ...asMember(ana),
    })
    expect(finished.completed).toBe(true)
    const clamped = await payload.update({
      collection: 'viewings',
      id: viewing.id,
      data: { positionSeconds: 9999, durationSeconds: 600 },
      ...asMember(ana),
    })
    expect(clamped.positionSeconds).toBe(600)
  })

  it('lets an admin read the rows, never edit them', async () => {
    const ana = await newMember('admin')
    const item = await rowAs(ana, 'list-items', { short: published })
    const admin = await payload.create({
      collection: 'users',
      data: {
        email: `accounts-test-admin-${token}@example.org`,
        password: PASSWORD,
        role: 'admin',
      },
    })
    const rows = await payload.find({
      collection: 'list-items',
      where: { member: { equals: ana.id } },
      ...asAdmin(admin),
    })
    expect(rows.docs.map((doc) => doc.id)).toEqual([item.id])
    await expect(
      payload.update({
        collection: 'list-items',
        id: item.id,
        data: { savedAt: new Date().toISOString() },
        ...asAdmin(admin),
      }),
    ).rejects.toThrow()
    await payload.delete({ collection: 'users', id: admin.id })
  })

  it('deletes everything of a member when the account goes, and of a short when it goes', async () => {
    const ana = await newMember('erase')
    const extra = await newShort('Efimero', 'published')
    for (const short of [published, extra]) {
      await rowAs(ana, 'list-items', { short })
      await rowAs(ana, 'ratings', { short, value: 'love' })
      await rowAs(ana, 'viewings', { short, positionSeconds: 5, durationSeconds: 600 })
    }
    const rowsOf = async (where: Where) => {
      let total = 0
      for (const collection of ['list-items', 'ratings', 'viewings'] as const)
        total += (await payload.count({ collection, where })).totalDocs
      return total
    }

    await payload.delete({ collection: 'shorts', id: extra })
    expect(await rowsOf({ short: { equals: extra } })).toBe(0)
    expect(await rowsOf({ member: { equals: ana.id } })).toBe(3)

    await payload.delete({ collection: 'members', id: ana.id, ...asMember(ana) })
    expect(await rowsOf({ member: { equals: ana.id } })).toBe(0)
  })
})
