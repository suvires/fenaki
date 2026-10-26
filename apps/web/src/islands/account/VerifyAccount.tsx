import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { api } from '../../lib/accountClient.ts'

interface VerifyAccountProps {
  locale: Locale
  /** The token in the link of the email. */
  token: string
  signInHref: string
  /** Someone is already signed in on this browser: there is nothing to sign in to. */
  signedIn: boolean
  homeHref: string
}

type State = 'working' | 'verified' | 'invalid'

/**
 * Consumes the token of the verification email once the page is open, with a POST: opening the
 * link in a mail scanner that does not run scripts leaves the token unused.
 */
export function VerifyAccount({
  locale,
  token,
  signInHref,
  signedIn,
  homeHref,
}: VerifyAccountProps) {
  const t = createTranslator(locale)
  const [state, setState] = useState<State>('working')

  useEffect(() => {
    let cancelled = false
    void api('verify', 'POST', { token }).then((result) => {
      if (!cancelled) setState(result.ok ? 'verified' : 'invalid')
    })
    return () => {
      cancelled = true
    }
  }, [token])

  if (state === 'working')
    return (
      <Notice role="status" aria-busy="true">
        {t('account.verify.working')}
      </Notice>
    )
  if (state === 'invalid')
    return (
      <Notice tone="danger" role="alert" title={t('account.verify.failTitle')}>
        <p className="m-0">{t('account.verify.failText')}</p>
        <div>
          <Button variant="secondary" href={signInHref}>
            {t('account.verify.signIn')}
          </Button>
        </div>
      </Notice>
    )
  return (
    <Notice role="status" title={t('account.verify.okTitle')}>
      <p className="m-0">{t('account.verify.okText')}</p>
      <div>
        <Button href={signedIn ? homeHref : signInHref}>
          {signedIn ? t('site.home') : t('account.verify.signIn')}
        </Button>
      </div>
    </Notice>
  )
}
