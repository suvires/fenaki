import { describe, expect, it } from 'vitest'
import { emailAdapter, smtpTransport } from '../src/email.ts'

describe('smtpTransport', () => {
  it('is off without SMTP_HOST, so Payload logs emails to the console', () => {
    expect(smtpTransport({})).toBeUndefined()
    expect(emailAdapter({})).toBeUndefined()
  })

  it('uses STARTTLS on 587 by default, as Amazon SES expects', () => {
    expect(
      smtpTransport({
        SMTP_HOST: 'email-smtp.eu-west-1.amazonaws.com',
        SMTP_USERNAME: 'AKIA',
        SMTP_PASSWORD: 'secret',
      }),
    ).toEqual({
      host: 'email-smtp.eu-west-1.amazonaws.com',
      port: 587,
      secure: false,
      requireTLS: true,
      ignoreTLS: false,
      auth: { user: 'AKIA', pass: 'secret' },
    })
  })

  it('supports implicit TLS and a plain local server such as Mailpit', () => {
    expect(smtpTransport({ SMTP_HOST: 'smtp', SMTP_TLS: 'TLS' })).toMatchObject({
      port: 465,
      secure: true,
    })
    expect(smtpTransport({ SMTP_HOST: 'mailpit', SMTP_PORT: '1025', SMTP_TLS: 'none' })).toEqual({
      host: 'mailpit',
      port: 1025,
      secure: false,
      requireTLS: false,
      ignoreTLS: true,
      auth: undefined,
    })
  })

  it('rejects an unknown TLS mode instead of sending in clear text', () => {
    expect(() => smtpTransport({ SMTP_HOST: 'smtp', SMTP_TLS: 'ssl' })).toThrow(/SMTP_TLS/)
  })
})
