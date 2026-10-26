import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice, TextField } from '@fenaki/ui'
import { useState, type SubmitEvent } from 'react'
import { api } from '../../lib/accountClient.ts'
import { errorKey, fieldOf } from '../../lib/accountErrors.ts'
import { mergeLocalIntoAccount } from '../../lib/accountSync.ts'
import { checkEmail } from '../../lib/account/rules.ts'

interface SignInFormProps {
  locale: Locale
  /** Where to go after signing in: a path of this site, already checked by the server. */
  next: string
  forgotHref: string
  signUpHref: string
  /** A message from where the viewer came from: «Correo verificado», «Contraseña cambiada». */
  notice?: 'verified' | 'reset' | 'deleted'
}

type State = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'failed'; code: string }

/**
 * Signs in. The browser's list and ratings (kept while nobody was signed in) are merged into the
 * account before leaving the page.
 */
export function SignInForm({ locale, next, forgotHref, signUpHref, notice }: SignInFormProps) {
  const t = createTranslator(locale)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = checkEmail(form.get('email'))
    const password = String(form.get('password') ?? '')
    if (!email.ok || password === '') {
      setErrors({
        email: email.ok ? undefined : t(errorKey(`email_${email.error}`)),
        password: password === '' ? t(errorKey('password_empty')) : undefined,
      })
      return
    }
    setErrors({})
    setState({ kind: 'submitting' })
    const result = await api('login', 'POST', { email: email.email, password })
    if (!result.ok) {
      const field = fieldOf(result.error)
      if (field) {
        setErrors({ [field]: t(errorKey(result.error)) })
        return setState({ kind: 'idle' })
      }
      return setState({ kind: 'failed', code: result.error ?? 'server' })
    }
    // The cookie is set. What this browser kept goes to the account; if that fails the server
    // still has it only here, so it stays and the next page load tries again.
    await mergeLocalIntoAccount(locale)
    window.location.assign(next)
  }

  const submitting = state.kind === 'submitting'
  return (
    <div className="grid gap-4">
      {notice ? <Notice role="status">{t(`account.signIn.notice.${notice}`)}</Notice> : null}
      <form className="grid gap-4" noValidate onSubmit={submit}>
        <TextField
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          label={t('account.common.email.label')}
          placeholder={t('account.common.email.placeholder')}
          error={errors.email}
          onChange={() => setErrors((e) => ({ ...e, email: undefined }))}
        />
        <TextField
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          label={t('account.common.password.label')}
          error={errors.password}
          onChange={() => setErrors((e) => ({ ...e, password: undefined }))}
        />
        <div>
          <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
            {submitting ? t('account.common.working') : t('account.signIn.submit')}
          </Button>
        </div>
        {state.kind === 'failed' ? (
          <Notice tone="danger" role="alert">
            {state.code === 'unverified'
              ? t('account.signIn.error.unverified')
              : state.code === 'invalid'
                ? t('account.signIn.error.invalid')
                : t(errorKey(state.code))}
          </Notice>
        ) : null}
      </form>
      <p className="m-0 text-small">
        <a className="text-ink" href={forgotHref}>
          {t('account.signIn.forgot')}
        </a>
      </p>
      <p className="m-0 text-small text-ink-muted">
        {t('account.signIn.noAccount')}{' '}
        <a className="text-ink" href={signUpHref}>
          {t('account.signIn.signUpLink')}
        </a>
      </p>
    </div>
  )
}
