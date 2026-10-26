import { defineMiddleware } from 'astro:middleware'
import { clearSession, resolveSession, SESSION_COOKIE, setSession } from './lib/account/session.ts'
import { withSecurityHeaders } from './lib/security-headers.ts'
import { reportError } from './lib/sentry.ts'
import { siteMode } from './lib/services.ts'
import { isHiddenInMode } from './lib/site-mode.ts'

/** Static files and generated images never depend on who is signed in. */
const NO_SESSION = /^\/(_astro\/|og\/|up$|favicon|apple-touch-icon|robots\.txt|sitemap)/

export const onRequest = defineMiddleware(async (context, next) => {
  // Before launch, the catalog routes are not public: they answer as if they did not exist.
  if (isHiddenInMode(context.url.pathname, siteMode)) {
    if (context.url.pathname.startsWith('/api/'))
      return withSecurityHeaders(new Response(null, { status: 404 }))
    return withSecurityHeaders(await context.rewrite('/404'))
  }
  // Who is signed in, once per request. A token that no longer works is dropped.
  const token = context.cookies.get(SESSION_COOKIE)?.value
  if (token && !NO_SESSION.test(context.url.pathname)) {
    const session = await resolveSession(token)
    if (session) {
      context.locals.member = session.member
      if (session.refreshed)
        setSession(context.cookies, session.refreshed.token, session.refreshed.exp)
    } else clearSession(context.cookies)
  }
  try {
    const response = await next()
    // What a signed-in viewer sees is theirs: no shared cache keeps it.
    if (context.locals.member) {
      response.headers.set('Cache-Control', 'private, no-store')
      response.headers.append('Vary', 'Cookie')
    }
    return withSecurityHeaders(response)
  } catch (error) {
    reportError(error, context.url.pathname)
    throw error
  }
})
