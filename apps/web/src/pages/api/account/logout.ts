import { defaultLocale } from '@fenaki/i18n'
import { cms } from '../../../lib/account/payload.ts'
import { accountRoute } from '../../../lib/account/route.ts'
import { clearSession } from '../../../lib/account/session.ts'
import { paths } from '../../../lib/i18n.ts'

/** Signs out: revokes the token in the CMS and clears the cookie. A form posts here; it lands on the home page. */
export const POST = accountRoute(
  { limit: 'session', noBody: true },
  async ({ member, context }) => {
    if (member)
      await cms('members/logout', { method: 'POST', token: member.token }).catch(() => undefined)
    clearSession(context.cookies)
    return context.redirect(paths.home(defaultLocale), 303)
  },
)
