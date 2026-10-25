/**
 * Configures listmonk and Umami for the site. Idempotent: run it after `docker compose up -d`
 * and again whenever the confirmation email copy changes.
 *
 *   pnpm setup:services      (from the repository root; reads apps/web/.env)
 *
 * listmonk: site URL, sender, SMTP server (Mailpit locally, Amazon SES in production), privacy
 * settings, the two waitlist lists and the confirmation email template.
 * Umami: the website the tracking script reports to, with the id in UMAMI_WEBSITE_ID.
 */
import { defaultLocale, locales } from '@fenaki/i18n'
import { confirmationEmail } from '../src/lib/confirmation-email.ts'
import {
  confirmationTemplateName,
  createListmonk,
  LIST_TAGS,
  type Listmonk,
  type ListmonkTemplate,
} from '@fenaki/waitlist'

function env(name: string, fallback?: string): string {
  const value = process.env[name] || fallback
  if (value === undefined) throw new Error(`Set ${name} in apps/web/.env`)
  return value
}

const log = (message: string) => console.log(`setup: ${message}`)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(name: string, check: () => Promise<unknown>) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await check()
      return
    } catch {
      await sleep(1000)
    }
  }
  throw new Error(`${name} is not reachable. Is \`docker compose up -d\` running?`)
}

/**
 * listmonk masks secrets as «••••» when reading settings and keeps the stored value when it gets
 * an empty string back, so masked values are blanked before saving.
 */
function unmask(value: unknown): unknown {
  if (typeof value === 'string') return /^•+$/.test(value) ? '' : value
  if (Array.isArray(value)) return value.map(unmask)
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, unmask(v)]))
  return value
}

async function configureListmonk(client: Listmonk) {
  await waitFor('listmonk', () => client.request('GET', '/api/settings'))

  const settings = unmask(
    await client.request<Record<string, unknown>>('GET', '/api/settings'),
  ) as Record<string, unknown>
  const smtpAuth = env('LISTMONK_SMTP_AUTH', 'none')
  const sendsThroughSes = env('LISTMONK_SMTP_HOST', 'mailpit').endsWith('.amazonaws.com')
  const next = {
    ...settings,
    'app.site_name': 'Fenaki',
    // The public address (unsubscribe links in emails); LISTMONK_URL may be an internal one.
    'app.root_url': env('LISTMONK_PUBLIC_URL', env('LISTMONK_URL', 'http://localhost:9000')),
    'app.from_email': env('LISTMONK_FROM_EMAIL', 'Fenaki <hola@fenaki.tv>'),
    'app.lang': defaultLocale,
    // The web app sends its own confirmation email, and the only way in is its form.
    'app.send_optin_confirmation': false,
    'app.enable_public_subscription_page': false,
    'app.check_updates': false,
    // Opens and clicks are not tracked until that is settled (privacy policy, section 2.1).
    'privacy.disable_tracking': true,
    'privacy.individual_tracking': false,
    // Proof of consent: the privacy policy lists the confirmation IP.
    'privacy.record_optin_ip': true,
    'privacy.unsubscribe_header': true,
    // Bounces and complaints: SES posts them through SNS to /webhooks/service/ses. A hard bounce or
    // a complaint blocklists the address at once; soft bounces are only counted.
    'bounce.enabled': true,
    'bounce.webhooks_enabled': sendsThroughSes,
    'bounce.ses_enabled': sendsThroughSes,
    'bounce.actions': {
      hard: { count: 1, action: 'blocklist' },
      complaint: { count: 1, action: 'blocklist' },
      soft: { count: 3, action: 'none' },
    },
    smtp: [
      {
        name: 'fenaki',
        uuid: '',
        enabled: true,
        host: env('LISTMONK_SMTP_HOST', 'mailpit'),
        hello_hostname: '',
        port: Number(env('LISTMONK_SMTP_PORT', '1025')),
        auth_protocol: smtpAuth,
        username: env('LISTMONK_SMTP_USERNAME', ''),
        password: env('LISTMONK_SMTP_PASSWORD', ''),
        email_headers: [],
        max_conns: 10,
        max_msg_retries: 2,
        msg_retry_delay: '10ms',
        idle_timeout: '15s',
        wait_timeout: '5s',
        tls_type: env('LISTMONK_SMTP_TLS', 'none'),
        tls_skip_verify: false,
        from_addresses: [],
      },
    ],
  }
  await client.request('PUT', '/api/settings', { body: next })
  log(`listmonk: settings saved (SMTP ${next.smtp[0]?.host}:${next.smtp[0]?.port})`)
  // listmonk restarts itself to apply new settings.
  await sleep(2000)
  await waitFor('listmonk', () => client.request('GET', '/api/lists'))

  const lists = [
    { tag: LIST_TAGS.launch, name: 'Lista de espera: aviso de lanzamiento' },
    { tag: LIST_TAGS.weekly, name: 'Selección semanal' },
  ]
  for (const list of lists) {
    const existing = await client.listsByTag(list.tag)
    if (existing.length > 0) continue
    await client.request('POST', '/api/lists', {
      body: { name: list.name, type: 'public', optin: 'double', tags: [list.tag] },
    })
    log(`listmonk: created the list «${list.name}»`)
  }

  for (const locale of locales) {
    const name = confirmationTemplateName(locale)
    const { subject, body } = confirmationEmail(locale)
    const template: Partial<ListmonkTemplate> & Record<string, unknown> = {
      name,
      type: 'tx',
      subject,
      body,
    }
    const existing = await client.templateByName(name)
    if (existing) {
      await client.request('PUT', `/api/templates/${existing.id}`, { body: template })
    } else {
      await client.request('POST', '/api/templates', { body: template })
    }
    log(`listmonk: ${existing ? 'updated' : 'created'} the template ${name}`)
  }
}

const DEFAULT_UMAMI_PASSWORD = 'umami'

async function configureUmami() {
  const url = env('UMAMI_URL', 'http://localhost:3001')
  const websiteId = process.env.UMAMI_WEBSITE_ID
  if (!websiteId) {
    log('umami: UMAMI_WEBSITE_ID not set, skipping')
    return
  }
  const username = env('UMAMI_USERNAME', 'admin')
  const password = env('UMAMI_PASSWORD', DEFAULT_UMAMI_PASSWORD)
  const login = async (attempt: string) => {
    const response = await fetch(new URL('/api/auth/login', url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: attempt }),
    })
    if (response.status === 401) return undefined
    if (!response.ok) throw new Error(`Umami login failed (${response.status})`)
    return ((await response.json()) as { token: string }).token
  }
  let token: string | undefined
  await waitFor('Umami', async () => {
    token = await login(password)
  })
  // A new Umami starts with admin / umami: replace it with UMAMI_PASSWORD the first time.
  if (!token && password !== DEFAULT_UMAMI_PASSWORD) {
    const initial = await login(DEFAULT_UMAMI_PASSWORD)
    if (initial) {
      const changed = await fetch(new URL('/api/me/password', url), {
        method: 'POST',
        headers: { Authorization: `Bearer ${initial}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: DEFAULT_UMAMI_PASSWORD, newPassword: password }),
      })
      if (!changed.ok) throw new Error(`Umami: could not change the password (${changed.status})`)
      log('umami: replaced the default admin password')
      token = await login(password)
    }
  }
  if (!token) throw new Error('Umami login failed: check UMAMI_USERNAME and UMAMI_PASSWORD')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  // Umami answers 200 with `null` for an unknown website id.
  const found = await fetch(new URL(`/api/websites/${websiteId}`, url), { headers })
  if (found.ok && (await found.json()) !== null) {
    log(`umami: website ${websiteId} exists`)
    return
  }
  const created = await fetch(new URL('/api/websites', url), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: websiteId,
      name: 'Fenaki',
      domain: env('UMAMI_WEBSITE_DOMAIN', 'localhost'),
    }),
  })
  if (!created.ok) throw new Error(`Umami: could not create the website (${created.status})`)
  log(`umami: created website ${websiteId}`)
}

await configureListmonk(
  createListmonk({
    url: env('LISTMONK_URL', 'http://localhost:9000'),
    user: env('LISTMONK_API_USER', 'fenaki-web'),
    token: env('LISTMONK_API_TOKEN'),
  }),
)
await configureUmami()
log('done')
