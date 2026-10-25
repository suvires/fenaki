import type { Instrumentation } from 'next'

/** Next.js server hooks: Sentry starts with the server and receives unhandled request errors. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { initSentry } = await import('./sentry.ts')
  initSentry()
}

export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.SENTRY_DSN) return
  const { Sentry } = await import('./sentry.ts')
  Sentry.captureException(error, { tags: { path: request.path } })
}
