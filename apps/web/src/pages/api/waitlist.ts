import { defaultLocale } from '@fenaki/i18n'
import type { APIRoute } from 'astro'
import { localeFrom } from '../../lib/i18n.ts'
import { createRateLimit } from '../../lib/rate-limit.ts'
import { fromEmail, listmonk, siteMode, siteUrl } from '../../lib/services.ts'
import { checkEmail, subscribe } from '@fenaki/waitlist'

const allow = createRateLimit(10, 10 * 60 * 1000)

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * Signup: subscribes the address in listmonk with double opt-in and sends the confirmation email.
 * Before the launch (`landing`) it is the waitlist for the launch notice; once the catalog is open
 * it is only the weekly selection, whatever the form sends. Answers the same for new, pending and
 * confirmed addresses.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return json({ error: 'invalid' }, 400)
  // Bots fill in the hidden field: pretend it worked.
  if (typeof body.website === 'string' && body.website !== '') return json({ status: 'pending' })

  const checked = checkEmail(body.email)
  if (!checked.ok) return json({ error: checked.error }, 400)
  if (!allow(clientAddress)) return json({ error: 'rate_limited' }, 429)

  try {
    const launch = siteMode === 'landing'
    await subscribe(listmonk(), {
      email: checked.email,
      launch,
      newsletter: launch ? body.newsletter === true : true,
      locale:
        localeFrom(typeof body.locale === 'string' ? body.locale : undefined) ?? defaultLocale,
      siteUrl,
      fromEmail,
    })
    return json({ status: 'pending' })
  } catch (error) {
    console.error('waitlist: signup failed', error)
    return json({ error: 'server' }, 503)
  }
}
