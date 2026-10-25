/** Error tracking with Sentry (EU region), server side only. Off without SENTRY_DSN. */
import * as Sentry from '@sentry/node'
import { SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE } from 'astro:env/server'

if (SENTRY_DSN && !Sentry.isInitialized()) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    // Kamal sets KAMAL_VERSION (the git commit) in every container.
    release: SENTRY_RELEASE || process.env.KAMAL_VERSION || undefined,
    serverName: 'web',
    tracesSampleRate: 0,
    // None of the request data the SDK collects by default: visitors' cookies, bodies (waitlist
    // addresses) and query strings (confirmation tokens) never leave the server.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ['user-agent', 'referer'] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
    },
  })
}

/** Reports an error that would otherwise only reach the logs. */
export function reportError(error: unknown, path: string): void {
  if (Sentry.isInitialized()) Sentry.captureException(error, { tags: { path } })
}
