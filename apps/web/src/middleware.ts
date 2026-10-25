import { defineMiddleware } from 'astro:middleware'
import { withSecurityHeaders } from './lib/security-headers.ts'
import { reportError } from './lib/sentry.ts'
import { siteMode } from './lib/services.ts'
import { isHiddenInMode } from './lib/site-mode.ts'

export const onRequest = defineMiddleware(async (context, next) => {
  // Before launch, the catalog routes are not public: they answer as if they did not exist.
  if (isHiddenInMode(context.url.pathname, siteMode)) {
    if (context.url.pathname.startsWith('/api/'))
      return withSecurityHeaders(new Response(null, { status: 404 }))
    return withSecurityHeaders(await context.rewrite('/404'))
  }
  try {
    return withSecurityHeaders(await next())
  } catch (error) {
    reportError(error, context.url.pathname)
    throw error
  }
})
