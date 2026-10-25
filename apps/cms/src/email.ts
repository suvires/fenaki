import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

type Env = Record<string, string | undefined>
type TransportOptions = NonNullable<Parameters<typeof nodemailerAdapter>[0]>['transportOptions']

/**
 * SMTP transport for Payload's account emails (password resets), from the environment: Amazon SES
 * in production (`email-smtp.<region>.amazonaws.com`, port 587, STARTTLS), Mailpit locally if you
 * want to see them. `SMTP_TLS` takes the same values as listmonk's: `STARTTLS` (default), `TLS`
 * (implicit, port 465) or `none`. Undefined without SMTP_HOST.
 */
export function smtpTransport(env: Env): TransportOptions {
  if (!env.SMTP_HOST) return undefined
  const tls = (env.SMTP_TLS ?? 'STARTTLS').toUpperCase()
  if (!['STARTTLS', 'TLS', 'NONE'].includes(tls))
    throw new Error(`SMTP_TLS must be STARTTLS, TLS or none, not ${env.SMTP_TLS}`)
  return {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? (tls === 'TLS' ? 465 : 587)),
    secure: tls === 'TLS',
    requireTLS: tls === 'STARTTLS',
    ignoreTLS: tls === 'NONE',
    auth: env.SMTP_USERNAME
      ? { user: env.SMTP_USERNAME, pass: env.SMTP_PASSWORD ?? '' }
      : undefined,
  }
}

/** Without SMTP_HOST there is no adapter, and Payload writes emails to the console instead. */
export function emailAdapter(env: Env = process.env) {
  const transportOptions = smtpTransport(env)
  if (!transportOptions) return undefined
  return nodemailerAdapter({
    defaultFromAddress: env.EMAIL_FROM_ADDRESS ?? 'hola@fenaki.tv',
    defaultFromName: env.EMAIL_FROM_NAME ?? 'Fenaki',
    transportOptions,
  })
}
