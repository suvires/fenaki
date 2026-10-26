import { defaultLocale } from '@fenaki/i18n'
import {
  clearViewings,
  removeViewing,
  saveViewing,
  SessionExpired,
} from '../../../lib/account/data.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { checkProgress, checkSlug } from '../../../lib/account/rules.ts'
import { publishedShortId } from '../../../lib/account/shorts.ts'
import { localeFrom } from '../../../lib/i18n.ts'

/** Below this, a viewing is not recorded for the first time: the viewer pressed play and left. */
const MIN_FIRST_SECONDS = 3

const localeOf = (body: Record<string, unknown>) =>
  localeFrom(typeof body.locale === 'string' ? body.locale : undefined) ?? defaultLocale

/**
 * Where the viewer is in a short: POST saves it (the player does every ~15 s and when the page
 * is left, with `sendBeacon`); DELETE removes one viewing from the history, or all of them.
 */
export const POST = accountRoute({ limit: 'progress', member: true }, async ({ body, member }) => {
  const slug = checkSlug(body.slug)
  const progress = checkProgress(body.position, body.duration)
  if (!slug || !progress) return fail('invalid', 400)
  const shortId = await publishedShortId(localeOf(body), slug)
  if (shortId === undefined) return fail('not_found', 404)
  if (progress.position < MIN_FIRST_SECONDS) return json({ ok: true, skipped: true })
  try {
    await saveViewing(member, shortId, progress.position, progress.duration)
  } catch (error) {
    if (error instanceof SessionExpired) return fail('signed_out', 401)
    throw error
  }
  return json({ ok: true })
})

export const DELETE = accountRoute({ limit: 'write', member: true }, async ({ body, member }) => {
  try {
    if (body.all === true) {
      await clearViewings(member)
      return json({ ok: true })
    }
    const slug = checkSlug(body.slug)
    if (!slug) return fail('invalid', 400)
    const shortId = await publishedShortId(localeOf(body), slug)
    if (shortId !== undefined) await removeViewing(member, shortId)
    return json({ ok: true })
  } catch (error) {
    if (error instanceof SessionExpired) return fail('signed_out', 401)
    throw error
  }
})
