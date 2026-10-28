import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { api } from '../../lib/accountClient.ts'

interface ConfirmEmailProps {
  locale: Locale
  /** The token in the link of the email. */
  token: string
  accountHref: string
}

type State = 'working' | 'changed' | 'invalid' | 'taken'

/**
 * Consumes the token of the change-email message once the page is open, with a POST: opening the
 * link in a mail scanner that does not run scripts leaves the token unused.
 */
export function ConfirmEmail({ locale, token, accountHref }: ConfirmEmailProps) {
  const t = createTranslator(locale)
  const [state, setState] = useState<State>('working')

  useEffect(() => {
    let cancelled = false
    void api('confirm-email', 'POST', { token }).then((result) => {
      if (cancelled) return
      setState(result.ok ? 'changed' : result.error === 'email_taken' ? 'taken' : 'invalid')
    })
    return () => {
      cancelled = true
    }
  }, [token])

  if (state === 'working')
    return (
      <p role="status" className="m-0 text-body text-secondary">
        {t('account.confirmEmail.working')}
      </p>
    )
  const ok = state === 'changed'
  return (
    <Notice
      tone={ok ? 'info' : 'danger'}
      role={ok ? 'status' : 'alert'}
      title={ok ? t('account.confirmEmail.okTitle') : t('account.confirmEmail.failTitle')}
    >
      <p className="m-0">
        {ok
          ? t('account.confirmEmail.okText')
          : state === 'taken'
            ? t('account.confirmEmail.takenText')
            : t('account.confirmEmail.failText')}
      </p>
      <div>
        <Button variant="secondary" href={accountHref}>
          {t('account.confirmEmail.account')}
        </Button>
      </div>
    </Notice>
  )
}
