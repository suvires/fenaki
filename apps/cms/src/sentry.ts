import * as Sentry from '@sentry/node'
import type { AfterErrorHook } from 'payload'

/**
 * Error tracking with Sentry (EU region), for the admin server and the jobs worker alike. Off
 * without SENTRY_DSN, so development and tests never send anything. Errors only (no tracing), and
 * none of the request data the SDK collects by default: no users, cookies, bodies, query strings
 * or GraphQL variables, which may hold personal data or one-time tokens.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  if (!dsn || Sentry.isInitialized()) return
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'production',
    // Kamal sets KAMAL_VERSION (the git commit) in every container.
    release: process.env.SENTRY_RELEASE || process.env.KAMAL_VERSION || undefined,
    serverName: 'cms',
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ['user-agent', 'referer'] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: true, variables: false },
    },
    tracesSampleRate: 0,
  })
}

/** Payload's REST and GraphQL errors. Client errors (4xx) are expected and not reported. */
export const reportApiError: AfterErrorHook = ({ error, collection }) => {
  const status = (error as { status?: number }).status ?? 500
  if (status >= 500 && Sentry.isInitialized())
    Sentry.captureException(error, { tags: { collection: collection?.slug } })
}

export { Sentry }
