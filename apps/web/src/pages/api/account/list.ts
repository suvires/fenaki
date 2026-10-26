import { defaultLocale } from '@fenaki/i18n'
import { addToList, removeFromList, SessionExpired } from '../../../lib/account/data.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { checkSlug } from '../../../lib/account/rules.ts'
import { publishedShortId } from '../../../lib/account/shorts.ts'
import { localeFrom } from '../../../lib/i18n.ts'

/** «Mi lista» of the account: PUT saves a short (again: moves it to the top), DELETE removes it. */
const change = (save: boolean) =>
  accountRoute({ limit: 'write', member: true }, async ({ body, member }) => {
    const slug = checkSlug(body.slug)
    if (!slug) return fail('invalid', 400)
    const locale =
      localeFrom(typeof body.locale === 'string' ? body.locale : undefined) ?? defaultLocale
    const shortId = await publishedShortId(locale, slug)
    if (shortId === undefined) return fail('not_found', 404)
    try {
      if (save) await addToList(member, shortId)
      else await removeFromList(member, shortId)
    } catch (error) {
      if (error instanceof SessionExpired) return fail('signed_out', 401)
      throw error
    }
    return json({ ok: true })
  })

export const PUT = change(true)
export const DELETE = change(false)
