import { describe, expect, it } from 'vitest'
import { composeOutbound, footerText, newMessageId, referencesFor } from '../src/crm/compose.ts'
import { imapConfig, mailboxConfig, smtpConfig } from '../src/crm/mailbox.ts'

describe('footerText', () => {
  it('says who we are, links the privacy policy and offers the opt-out', () => {
    const footer = footerText('https://fenaki.tv/')
    expect(footer).toContain('FENAKI')
    expect(footer).toContain('https://fenaki.tv/es/privacidad')
    expect(footer).toContain('«no»')
  })
})

describe('composeOutbound', () => {
  const base = {
    fromName: 'FENAKI',
    fromAddress: 'hola@fenaki.tv',
    to: { email: 'ana@festival.example', name: 'Ana' },
    subject: 'Una propuesta\r\nBcc: x@y',
    body: 'Hola Ana,\r\n\r\nUn saludo.\n',
    messageId: '<m1@fenaki.tv>',
    siteUrl: 'https://fenaki.tv',
  }

  it('is plain text from FENAKI, with Reply-To and the footer after a signature line, no BCC', () => {
    const mail = composeOutbound(base)
    expect(mail.from).toEqual({ name: 'FENAKI', address: 'hola@fenaki.tv' })
    expect(mail.replyTo).toBe('hola@fenaki.tv')
    expect(mail.messageId).toBe('<m1@fenaki.tv>')
    expect(mail.text).toContain('Un saludo.\n\n-- \n')
    expect(mail.text).toContain('/es/privacidad')
    expect(mail).not.toHaveProperty('bcc')
    expect(mail).not.toHaveProperty('html')
  })

  it('cannot be made to inject a header through the subject', () => {
    expect(composeOutbound(base).subject).toBe('Una propuesta Bcc: x@y')
  })

  it('threads a reply', () => {
    const mail = composeOutbound({ ...base, inReplyTo: '<r@x>', references: '<a@x> <r@x>' })
    expect(mail.inReplyTo).toBe('<r@x>')
    expect(mail.references).toBe('<a@x> <r@x>')
  })
})

describe('newMessageId and referencesFor', () => {
  it('uses the mailbox domain', () => {
    expect(newMessageId('hola@fenaki.tv')).toMatch(/^<[0-9a-f-]{36}@fenaki\.tv>$/)
  })
  it('appends the parent to its references', () => {
    expect(referencesFor({ messageId: '<b@x>', references: '<a@x>' })).toBe('<a@x> <b@x>')
    expect(referencesFor({ messageId: '<b@x>' })).toBe('<b@x>')
  })
})

describe('mailbox settings', () => {
  const env = {
    MAILBOX_USER: 'hola@fenaki.tv',
    MAILBOX_PASSWORD: 'secret',
    MAILBOX_IMAP_HOST: 'imap.mail.ovh.net',
    MAILBOX_IMAP_PORT: '993',
    MAILBOX_SMTP_HOST: 'smtp.mail.ovh.net',
    MAILBOX_SMTP_PORT: '465',
  }
  it('uses implicit TLS on 993 and 465', () => {
    expect(imapConfig(env)).toEqual({ host: 'imap.mail.ovh.net', port: 993, secure: true })
    expect(smtpConfig(env)).toEqual({
      host: 'smtp.mail.ovh.net',
      port: 465,
      secure: true,
      requireTLS: false,
    })
  })
  it('requires STARTTLS on 587 and nothing special on a local server', () => {
    expect(smtpConfig({ ...env, MAILBOX_SMTP_PORT: '587' })).toMatchObject({
      secure: false,
      requireTLS: true,
    })
    expect(smtpConfig({ ...env, MAILBOX_SMTP_PORT: '1025' })).toMatchObject({
      secure: false,
      requireTLS: false,
    })
    expect(imapConfig({ ...env, MAILBOX_IMAP_PORT: '143' })).toMatchObject({ secure: false })
  })
  it('is off without the host, the user or the password', () => {
    expect(imapConfig({ ...env, MAILBOX_IMAP_HOST: '' })).toBeUndefined()
    expect(smtpConfig({ ...env, MAILBOX_PASSWORD: '' })).toBeUndefined()
    expect(mailboxConfig({})).toBeUndefined()
    expect(mailboxConfig(env)?.fromName).toBe('FENAKI')
  })
})
