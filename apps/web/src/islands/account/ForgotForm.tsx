import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice, TextField } from '@fenaki/ui'
import { useState, type SubmitEvent } from 'react'
import { api } from '../../lib/accountClient.ts'
import { errorKey, fieldOf } from '../../lib/accountErrors.ts'
import { checkEmail } from '../../lib/account/rules.ts'

interface ForgotFormProps {
  locale: Locale
  signInHref: string
}

type State =
  { kind: 'idle' } | { kind: 'submitting' } | { kind: 'sent' } | { kind: 'failed'; code: string }

/** Asks for a reset link. The answer never says whether the address has an account. */
export function ForgotForm({ locale, signInHref }: ForgotFormProps) {
  const t = createTranslator(locale)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [emailError, setEmailError] = useState<string>()

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = checkEmail(new FormData(event.currentTarget).get('email'))
    if (!email.ok) return setEmailError(t(errorKey(`email_${email.error}`)))
    setEmailError(undefined)
    setState({ kind: 'submitting' })
    const result = await api('forgot', 'POST', { email: email.email })
    if (result.ok) return setState({ kind: 'sent' })
    if (fieldOf(result.error)) {
      setEmailError(t(errorKey(result.error)))
      return setState({ kind: 'idle' })
    }
    setState({ kind: 'failed', code: result.error ?? 'server' })
  }

  if (state.kind === 'sent')
    return (
      <Notice role="status" title={t('account.forgot.done.title')}>
        <p className="m-0">{t('account.forgot.done.text')}</p>
        <div>
          <Button variant="secondary" href={signInHref}>
            {t('account.forgot.back')}
          </Button>
        </div>
      </Notice>
    )

  const submitting = state.kind === 'submitting'
  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <TextField
        id="forgot-email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        label={t('account.common.email.label')}
        placeholder={t('account.common.email.placeholder')}
        error={emailError}
        onChange={() => setEmailError(undefined)}
      />
      <div>
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {submitting ? t('account.common.working') : t('account.forgot.submit')}
        </Button>
      </div>
      {state.kind === 'failed' ? (
        <Notice tone="danger" role="alert">
          {t(errorKey(state.code))}
        </Notice>
      ) : null}
      <p className="m-0 text-small">
        <a className="text-ink" href={signInHref}>
          {t('account.forgot.back')}
        </a>
      </p>
    </form>
  )
}
