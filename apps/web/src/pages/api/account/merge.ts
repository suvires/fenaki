import { defaultLocale } from '@fenaki/i18n'
import {
  addToList,
  loadAccountState,
  MAX_LIST,
  MAX_RATINGS,
  SessionExpired,
  setRating,
} from '../../../lib/account/data.ts'
import { parseIncoming, planMerge } from '../../../lib/account/merge.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { publishedShortId } from '../../../lib/account/shorts.ts'
import { localeFrom } from '../../../lib/i18n.ts'

/**
 * Adds what the visitor kept in the browser (list and ratings) to the account they signed in to.
 * The account wins where both have something. The page clears the browser's copy after the answer.
 */
export const POST = accountRoute({ limit: 'merge', member: true }, async ({ body, member }) => {
  const locale =
    localeFrom(typeof body.locale === 'string' ? body.locale : undefined) ?? defaultLocale
  const incoming = parseIncoming(body)
  try {
    const account = await loadAccountState(member, locale)
    const plan = planMerge(account, incoming, { list: MAX_LIST, ratings: MAX_RATINGS })
    // Sequential for the list, whose order matters; the ratings in small parallel batches.
    for (const entry of plan.list) {
      const shortId = await publishedShortId(locale, entry.slug)
      if (shortId !== undefined) await addToList(member, shortId, entry.savedAt)
    }
    for (let at = 0; at < plan.ratings.length; at += 10)
      await Promise.all(
        plan.ratings.slice(at, at + 10).map(async ([slug, value]) => {
          const shortId = await publishedShortId(locale, slug)
          if (shortId !== undefined) await setRating(member, shortId, value)
        }),
      )
    return json({ ok: true, added: { list: plan.list.length, ratings: plan.ratings.length } })
  } catch (error) {
    if (error instanceof SessionExpired) return fail('signed_out', 401)
    throw error
  }
})
