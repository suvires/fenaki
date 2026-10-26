import { createRichTranslator, createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice, TextField } from '@fenaki/ui'
import { Fragment, useState, type SubmitEvent } from 'react'
import { api } from '../../lib/accountClient.ts'
import { errorKey, fieldOf } from '../../lib/accountErrors.ts'
import { checkEmail, checkPassword } from '../../lib/account/rules.ts'

interface SignUpFormProps {
  locale: Locale
  signInHref: string
  privacyHref: string
}

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'sent'; email: string }
  | { kind: 'failed'; code: string }

/**
 * Creates the account. The answer is the same for a new address and one that already has an
 * account: the page asks the viewer to open the link in their email.
 */
export function SignUpForm({ locale, signInHref, privacyHref }: SignUpFormProps) {
  const t = createTranslator(locale)
  const rich = createRichTranslator(locale)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = checkEmail(form.get('email'))
    const password = checkPassword(form.get('password'))
    if (!email.ok || !password.ok) {
      setErrors({
        email: email.ok ? undefined : t(errorKey(`email_${email.error}`)),
        password: password.ok ? undefined : t(errorKey(`password_${password.error}`)),
      })
      return
    }
    setErrors({})
    setState({ kind: 'submitting' })
    const result = await api('signup', 'POST', {
      email: email.email,
      password: password.password,
      name: form.get('name'),
      website: form.get('website'),
    })
    if (result.ok) return setState({ kind: 'sent', email: email.email })
    const field = fieldOf(result.error)
    if (field) {
      setErrors({ [field]: t(errorKey(result.error)) })
      return setState({ kind: 'idle' })
    }
    setState({ kind: 'failed', code: result.error ?? 'server' })
  }

  if (state.kind === 'sent')
    return (
      <Notice role="status" title={t('account.signUp.done.title')}>
        <p className="m-0">{t('account.signUp.done.text', { email: state.email })}</p>
        <p className="m-0">{t('account.signUp.done.help')}</p>
      </Notice>
    )

  const submitting = state.kind === 'submitting'
  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <TextField
        id="signup-name"
        name="name"
        autoComplete="given-name"
        maxLength={80}
        label={t('account.common.name.label')}
        hint={t('account.common.name.hint')}
      />
      <TextField
        id="signup-email"
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
        id="signup-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        label={t('account.common.password.label')}
        hint={t('account.common.password.hint')}
        error={errors.password}
        onChange={() => setErrors((e) => ({ ...e, password: undefined }))}
      />
      {/* A field people never see: bots fill it in, and the server ignores those requests. */}
      <div aria-hidden="true" className="hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {submitting ? t('account.common.working') : t('account.signUp.submit')}
        </Button>
      </div>
      {state.kind === 'failed' ? (
        <Notice tone="danger" role="alert">
          {t(errorKey(state.code))}
        </Notice>
      ) : null}
      <p className="m-0 text-small text-ink-muted">
        {rich('account.signUp.privacy', {
          privacyPolicy: (
            <a className="text-ink" href={privacyHref}>
              {t('legal.links.privacyPolicy')}
            </a>
          ),
        }).map((part, index) => (
          <Fragment key={index}>{part}</Fragment>
        ))}
      </p>
      <p className="m-0 text-small text-ink-muted">
        {t('account.signUp.hasAccount')}{' '}
        <a className="text-ink" href={signInHref}>
          {t('account.signUp.signInLink')}
        </a>
      </p>
    </form>
  )
}
