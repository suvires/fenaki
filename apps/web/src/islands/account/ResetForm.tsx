import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice, TextField } from '@fenaki/ui'
import { useState, type SubmitEvent } from 'react'
import { api } from '../../lib/accountClient.ts'
import { errorKey, fieldOf } from '../../lib/accountErrors.ts'
import { checkPassword } from '../../lib/account/rules.ts'

interface ResetFormProps {
  locale: Locale
  token: string
  /** The sign-in page, with the notice that the password changed. */
  doneHref: string
  /** Asks for another reset link. */
  forgotHref: string
}

type State =
  { kind: 'idle' } | { kind: 'submitting' } | { kind: 'invalid' } | { kind: 'failed'; code: string }

/** Chooses a new password with the token of the reset email, then goes to sign in. */
export function ResetForm({ locale, token, doneHref, forgotHref }: ResetFormProps) {
  const t = createTranslator(locale)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [errors, setErrors] = useState<{ password?: string; repeat?: string }>({})

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = checkPassword(form.get('password'))
    if (!password.ok) return setErrors({ password: t(errorKey(`password_${password.error}`)) })
    if (form.get('repeat') !== password.password)
      return setErrors({ repeat: t('account.common.error.passwordMismatch') })
    setErrors({})
    setState({ kind: 'submitting' })
    const result = await api('reset', 'POST', { token, password: password.password })
    if (result.ok) return window.location.assign(doneHref)
    if (result.error === 'invalid_token') return setState({ kind: 'invalid' })
    if (fieldOf(result.error)) {
      setErrors({ password: t(errorKey(result.error)) })
      return setState({ kind: 'idle' })
    }
    setState({ kind: 'failed', code: result.error ?? 'server' })
  }

  if (state.kind === 'invalid')
    return (
      <Notice tone="danger" role="alert" title={t('account.reset.invalidTitle')}>
        <p className="m-0">{t('account.reset.invalidText')}</p>
        <div>
          <Button variant="secondary" href={forgotHref}>
            {t('account.reset.again')}
          </Button>
        </div>
      </Notice>
    )

  const submitting = state.kind === 'submitting'
  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <TextField
        id="reset-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        label={t('account.reset.password.label')}
        hint={t('account.common.password.hint')}
        error={errors.password}
        onChange={() => setErrors((e) => ({ ...e, password: undefined }))}
      />
      <TextField
        id="reset-repeat"
        name="repeat"
        type="password"
        autoComplete="new-password"
        required
        label={t('account.reset.repeat.label')}
        error={errors.repeat}
        onChange={() => setErrors((e) => ({ ...e, repeat: undefined }))}
      />
      <div>
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {submitting ? t('account.common.working') : t('account.reset.submit')}
        </Button>
      </div>
      {state.kind === 'failed' ? (
        <Notice tone="danger" role="alert">
          {t(errorKey(state.code))}
        </Notice>
      ) : null}
    </form>
  )
}
