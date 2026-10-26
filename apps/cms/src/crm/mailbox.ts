type Env = Record<string, string | undefined>

/**
 * The CRM's own mailbox (hola@fenaki.tv on OVHcloud Zimbra): outreach goes out through its SMTP
 * server, replies are read over IMAP, and a copy of each sent email is appended to its Sent
 * folder. Separate from Payload's own emails and listmonk, which keep using Amazon SES.
 * Docs: https://docs.ovhcloud.com/en/guides/web-cloud/email-and-collaborative-solutions/zimbra/mail-apps
 */
export interface MailboxConfig {
  user: string
  password: string
  fromName: string
  imap: { host: string; port: number; secure: boolean }
  smtp: { host: string; port: number; secure: boolean; requireTLS: boolean }
  sentFolder?: string
}

const port = (value: string | undefined, fallback: number) => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

/** IMAP: implicit TLS on 993, STARTTLS when the server offers it otherwise. */
export function imapConfig(env: Env): MailboxConfig['imap'] | undefined {
  if (!env.MAILBOX_IMAP_HOST || !env.MAILBOX_USER || !env.MAILBOX_PASSWORD) return undefined
  const p = port(env.MAILBOX_IMAP_PORT, 993)
  return { host: env.MAILBOX_IMAP_HOST, port: p, secure: p === 993 }
}

/** SMTP: implicit TLS on 465, required STARTTLS on 587, opportunistic elsewhere (Mailpit). */
export function smtpConfig(env: Env): MailboxConfig['smtp'] | undefined {
  if (!env.MAILBOX_SMTP_HOST || !env.MAILBOX_USER || !env.MAILBOX_PASSWORD) return undefined
  const p = port(env.MAILBOX_SMTP_PORT, 465)
  return { host: env.MAILBOX_SMTP_HOST, port: p, secure: p === 465, requireTLS: p === 587 }
}

export function mailboxConfig(env: Env = process.env): MailboxConfig | undefined {
  const imap = imapConfig(env)
  const smtp = smtpConfig(env)
  if (!imap || !smtp || !env.MAILBOX_USER || !env.MAILBOX_PASSWORD) return undefined
  return {
    user: env.MAILBOX_USER,
    password: env.MAILBOX_PASSWORD,
    fromName: env.EMAIL_FROM_NAME ?? 'FENAKI',
    imap,
    smtp,
    sentFolder: env.MAILBOX_SENT_FOLDER || undefined,
  }
}
