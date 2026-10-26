import { defaultLocale } from '@fenaki/i18n'
import { clearRating, SessionExpired, setRating } from '../../../lib/account/data.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { checkRating, checkSlug } from '../../../lib/account/rules.ts'
import { publishedShortId } from '../../../lib/account/shorts.ts'
import { localeFrom } from '../../../lib/i18n.ts'

/** Ratings of the account: PUT rates a short, DELETE clears the rating. */
export const PUT = accountRoute({ limit: 'write', member: true }, async ({ body, member }) => {
  const slug = checkSlug(body.slug)
  const value = checkRating(body.value)
  if (!slug || !value) return fail('invalid', 400)
  const locale =
    localeFrom(typeof body.locale === 'string' ? body.locale : undefined) ?? defaultLocale
  const shortId = await publishedShortId(locale, slug)
  if (shortId === undefined) return fail('not_found', 404)
  try {
    await setRating(member, shortId, value)
  } catch (error) {
    if (error instanceof SessionExpired) return fail('signed_out', 401)
    throw error
  }
  return json({ ok: true })
})

export const DELETE = accountRoute({ limit: 'write', member: true }, async ({ body, member }) => {
  const slug = checkSlug(body.slug)
  if (!slug) return fail('invalid', 400)
  const locale =
    localeFrom(typeof body.locale === 'string' ? body.locale : undefined) ?? defaultLocale
  const shortId = await publishedShortId(locale, slug)
  if (shortId === undefined) return json({ ok: true })
  try {
    await clearRating(member, shortId)
  } catch (error) {
    if (error instanceof SessionExpired) return fail('signed_out', 401)
    throw error
  }
  return json({ ok: true })
})
