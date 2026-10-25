import { defineMiddleware } from 'astro:middleware'
import { siteMode } from './lib/services.ts'
import { isHiddenInMode } from './lib/site-mode.ts'

/** Before launch, the catalog routes are not public: they answer as if they did not exist. */
export const onRequest = defineMiddleware(async (context, next) => {
  if (isHiddenInMode(context.url.pathname, siteMode)) {
    if (context.url.pathname.startsWith('/api/')) return new Response(null, { status: 404 })
    return context.rewrite('/404')
  }
  return next()
})
