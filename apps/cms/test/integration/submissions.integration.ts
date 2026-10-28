/* eslint-disable @typescript-eslint/no-non-null-assertion -- fixtures are known to exist */
/**
 * «Sube tu corto» on real services: PostgreSQL (the accounts test database) and Mailpit. YouTube is
 * faked. Sending, the short it creates, approving by publishing, rejecting, and the emails.
 */
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
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
  YOUTUBE_API_KEY: 'fake-key',
  TMDB_API_KEY: '',
  EMAIL_FROM_ADDRESS: 'hola@fenaki.test',
})

const { default: config } = await import('../../src/payload.config.ts')
const { createSubmission } = await import('../../src/submissions/submit.ts')

const token = Math.random().toString(36).slice(2, 8)
// Eleven characters, unique per run: YouTube ids.
const videoId = (n: number) => `sub${token}${n}`.padEnd(11, 'x').slice(0, 11)

let payload: Payload
let req: PayloadRequest
const members: number[] = []
const shorts: number[] = []

const fakeYouTube: typeof fetch = async (input) => {
  const url = new URL(String(input))
  if (url.hostname === 'www.youtube.com' && url.pathname === '/oembed')
    return Response.json({
      title: 'Corto de prueba',
      author_name: 'Canal de prueba',
      author_url: 'https://www.youtube.com/@canal-de-prueba',
      thumbnail_url: null,
    })
  if (url.hostname === 'www.googleapis.com') {
    const id = url.searchParams.get('id')!
    return Response.json({
      items: [
        {
          id,
          snippet: {
            title: 'Corto de prueba',
            channelId: 'UCprueba',
            channelTitle: 'Canal de prueba',
            description: 'Un corto.',
          },
          contentDetails: { duration: 'PT8M' },
          status: { embeddable: true, privacyStatus: 'public' },
        },
      ],
    })
  }
  return new Response(null, { status: 404 })
}

async function newMember(name: string) {
  const member = await payload.create({
    collection: 'members',
    data: {
      email: `submissions-${name}-${token}@example.org`,
      password: 'a-long-password-1',
      _verified: true,
    },
    disableVerificationEmail: true,
  })
  members.push(member.id)
  return member
}

async function mailTo(address: string, subject: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address} subject:"${subject}"`)}`,
    )
    const { messages } = (await search.json()) as { messages: { ID: string; Subject: string }[] }
    if (messages[0]) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)
      const { HTML } = (await message.json()) as { HTML: string }
      return { subject: messages[0].Subject, html: HTML }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No email «${subject}» for ${address} in Mailpit`)
}

const send = (memberId: number, body: Record<string, unknown>) =>
  createSubmission(req, memberId, body, fakeYouTube)

beforeAll(async () => {
  payload = await getPayload({ config })
  await payload.db.migrate()
  req = await createLocalReq({}, payload)
})

afterAll(async () => {
  for (const id of members)
    await payload.delete({ collection: 'members', id, overrideAccess: true }).catch(() => undefined)
  for (const id of shorts)
    await payload.delete({ collection: 'shorts', id, overrideAccess: true }).catch(() => undefined)
})

describe('sending a short', () => {
  it('takes only YouTube or Vimeo, with who sends it and the terms accepted', async () => {
    const member = await newMember('rules')
    const url = `https://youtu.be/${videoId(1)}`
    expect(
      await send(member.id, {
        url: 'https://example.com/x',
        relation: 'author',
        acceptTerms: true,
      }),
    ).toMatchObject({ ok: false, error: 'invalid_url' })
    expect(await send(member.id, { url, relation: 'cousin', acceptTerms: true })).toMatchObject({
      ok: false,
      error: 'invalid_relation',
    })
    expect(await send(member.id, { url, relation: 'author' })).toMatchObject({
      ok: false,
      error: 'terms',
    })
    const sent = await send(member.id, { url, relation: 'author', acceptTerms: true })
    expect(sent).toMatchObject({ ok: true, value: { status: 'in-review' } })
    // Their account menu shows «Mis envíos» from now on.
    expect((await payload.findByID({ collection: 'members', id: member.id })).hasSubmissions).toBe(
      true,
    )
    // Sending creates the short at once: the same video cannot be sent again, by anyone.
    const other = await newMember('other')
    expect(await send(other.id, { url, relation: 'producer', acceptTerms: true })).toMatchObject({
      ok: false,
      error: 'already_in_catalog',
    })
  })
})

describe('the review', () => {
  it('creates the short waiting for review, and publishing it approves the submission', async () => {
    const member = await newMember('sender')
    const sent = await send(member.id, {
      url: `https://www.youtube.com/watch?v=${videoId(2)}`,
      relation: 'producer',
      acceptTerms: true,
    })
    if (!sent.ok) throw new Error(sent.error)

    const submission = await payload.findByID({ collection: 'submissions', id: sent.value.id })
    const shortId = typeof submission.short === 'object' ? submission.short!.id : submission.short!
    shorts.push(shortId)
    const source = (
      await payload.find({ collection: 'sources', where: { short: { equals: shortId } }, depth: 0 })
    ).docs[0]!
    expect(source.channel?.kind).toBe('producer')
    expect(source.officialEvidence).toContain('Declared by the sender')
    expect(source.officialEvidence).toContain('«Sube tu corto»')
    const short = await payload.findByID({ collection: 'shorts', id: shortId, depth: 0 })
    expect(short.status).toBe('review')
    expect((await mailTo('hola@fenaki.test', 'Envío en revisión')).subject).toContain(
      'Corto de prueba',
    )

    // The editor completes the short and publishes it.
    await payload.update({
      collection: 'shorts',
      id: shortId,
      data: { type: 'fiction', status: 'published' },
    })
    const approved = await payload.findByID({ collection: 'submissions', id: sent.value.id })
    expect(approved.status).toBe('approved')
    expect(approved.notifiedAt).toBeTruthy()
    const email = await mailTo(member.email, 'Tu corto ya está en FENAKI')
    expect(email.html).toContain(`https://fenaki.tv/es/cortos/${short.slug}`)
  })

  it('emails the reason when a submission is rejected', async () => {
    const member = await newMember('rejected')
    const sent = await send(member.id, {
      url: `https://youtu.be/${videoId(3)}`,
      relation: 'author',
      acceptTerms: true,
    })
    if (!sent.ok) throw new Error(sent.error)
    await payload.update({
      collection: 'submissions',
      id: sent.value.id,
      data: { status: 'rejected', reason: 'El canal no es el oficial de la productora.' },
    })
    const email = await mailTo(member.email, 'Tu corto no ha entrado en FENAKI')
    expect(email.html).toContain('El canal no es el oficial de la productora.')
  })

  it('goes with the account', async () => {
    const member = await newMember('erased')
    const sent = await send(member.id, {
      url: `https://youtu.be/${videoId(4)}`,
      relation: 'author',
      acceptTerms: true,
    })
    if (!sent.ok) throw new Error(sent.error)
    await payload.delete({ collection: 'members', id: member.id, overrideAccess: true })
    const left = await payload.count({
      collection: 'submissions',
      where: { member: { equals: member.id } },
    })
    expect(left.totalDocs).toBe(0)
  })
})
