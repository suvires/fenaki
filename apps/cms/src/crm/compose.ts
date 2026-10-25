import { createTranslator, defaultLocale } from '@fenaki/i18n'
import { randomUUID } from 'node:crypto'

/** The footer every outreach email ends with: who we are, privacy policy, how to opt out. */
export function footerText(siteUrl: string, locale = defaultLocale): string {
  const t = createTranslator(locale)
  const privacy = `${siteUrl.replace(/\/+$/, '')}/${locale}/privacidad`
  return [
    t('crm.footer.identity'),
    t('crm.footer.privacy', { url: privacy }),
    t('crm.footer.optOut'),
  ].join('\n')
}

/** A fresh Message-ID on the mailbox's own domain. */
export function newMessageId(address: string): string {
  const domain = address.split('@')[1] || 'fenaki.tv'
  return `<${randomUUID()}@${domain}>`
}

export interface ComposeInput {
  fromName: string
  fromAddress: string
  to: { email: string; name?: string | null }
  subject: string
  body: string
  messageId: string
  inReplyTo?: string | null
  references?: string | null
  siteUrl: string
  date?: Date
}

/** Nodemailer options for one plain-text outreach email: no HTML, the footer after a `-- ` line. */
export function composeOutbound(input: ComposeInput) {
  const body = input.body.replace(/\r\n/g, '\n').trimEnd()
  return {
    from: { name: input.fromName, address: input.fromAddress },
    to: input.to.name ? { name: input.to.name, address: input.to.email } : input.to.email,
    replyTo: input.fromAddress,
    subject: input.subject.replace(/[\r\n]+/g, ' ').trim(),
    text: `${body}\n\n-- \n${footerText(input.siteUrl)}\n`,
    messageId: input.messageId,
    inReplyTo: input.inReplyTo || undefined,
    references: input.references || undefined,
    date: input.date,
  }
}

/** The References header for a reply: the parent's chain, then the parent itself. */
export function referencesFor(parent: { messageId?: string | null; references?: string | null }) {
  return (
    [parent.references?.trim(), parent.messageId?.trim()].filter(Boolean).join(' ') || undefined
  )
}
