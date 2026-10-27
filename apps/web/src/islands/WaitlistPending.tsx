import { createRichTranslator, createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice } from '@fenaki/ui'
import { Fragment, useState } from 'react'

/**
 * Where the waitlist form leaves the address it just sent, for the «Revisa tu email» page. Session
 * storage, not the URL: an email never goes in a query string.
 */
export const PENDING_KEY = 'fenaki:waitlist-pending'

export function rememberPending(email: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, email)
  } catch {
    // Without storage the page still explains what to do, only without the address.
  }
}

interface WaitlistPendingProps {
  locale: Locale
  /** Where to sign up again when the page is opened without a pending address. */
  backHref: string
}

type Resend = 'idle' | 'sending' | 'sent' | 'failed'

function readPending(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY)
  } catch {
    return null
  }
}

/** The «Revisa tu email» page's body: which address, what to do, and sending the email again. */
export function WaitlistPending({ locale, backHref }: WaitlistPendingProps) {
  const t = createTranslator(locale)
  const rich = createRichTranslator(locale)
  // Rendered in the browser only (client:only), so storage is there on the first render.
  const [email] = useState(readPending)
  const [resend, setResend] = useState<Resend>('idle')

  async function sendAgain() {
    if (!email) return
    setResend('sending')
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newsletter: false, locale, website: '' }),
      })
      setResend(response.ok ? 'sent' : 'failed')
    } catch {
      setResend('failed')
    }
  }

  if (!email) {
    return (
      <>
        <p className="m-0 text-body-l">{t('waitlist.pending.textNoEmail')}</p>
        <p className="m-0 text-body-l text-secondary">{t('waitlist.pending.help')}</p>
        <div>
          <Button size="lg" variant="secondary" href={backHref}>
            {t('waitlist.expired.back')}
          </Button>
        </div>
      </>
    )
  }
  return (
    <>
      <p className="m-0 text-body-l">
        {rich('waitlist.pending.text', {
          email: <strong className="text-primary">{email}</strong>,
        }).map((part, index) => (
          <Fragment key={index}>{part}</Fragment>
        ))}
      </p>
      <p className="m-0 text-body-l text-secondary">{t('waitlist.pending.help')}</p>
      <div>
        <Button
          size="lg"
          variant="secondary"
          disabled={resend === 'sending'}
          aria-busy={resend === 'sending'}
          onClick={sendAgain}
        >
          {t('waitlist.pending.resend')}
        </Button>
      </div>
      {resend === 'sent' && <Notice role="status">{t('waitlist.pending.resent')}</Notice>}
      {resend === 'failed' && (
        <Notice tone="danger" role="alert">
          {t('waitlist.error.server')}
        </Notice>
      )}
    </>
  )
}
