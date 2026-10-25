import { defineMiddleware } from 'astro:middleware'
import { reportError } from './lib/sentry.ts'
import { siteMode } from './lib/services.ts'
import { isHiddenInMode } from './lib/site-mode.ts'

export const onRequest = defineMiddleware(async (context, next) => {
  // Before launch, the catalog routes are not public: they answer as if they did not exist.
  if (isHiddenInMode(context.url.pathname, siteMode)) {
    if (context.url.pathname.startsWith('/api/')) return new Response(null, { status: 404 })
    return context.rewrite('/404')
  }
  try {
    return await next()
  } catch (error) {
    reportError(error, context.url.pathname)
    throw error
  }
})
