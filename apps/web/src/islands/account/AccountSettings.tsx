import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Dialog, Notice, PageHeader, TextField } from '@fenaki/ui'
import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { api } from '../../lib/accountClient.ts'
import { errorKey, fieldOf } from '../../lib/accountErrors.ts'
import { checkPassword } from '../../lib/account/rules.ts'

interface AccountSettingsProps {
  locale: Locale
  email: string
  /** A new email waiting for its link to be opened. */
  pendingEmail?: string
  name: string
  exportHref: string
  signOutAction: string
  /** Where to go once the account is deleted. */
  deletedHref: string
}

const heading = 'm-0 font-display text-title uppercase'

/** How long the name waits after the last keystroke before it is saved. */
const NAME_DEBOUNCE_MS = 700

type Status = 'idle' | 'saving' | 'saved' | `error:${string}`

/**
 * The account page: the name (saved as it is typed), the email (changed through a link sent to
 * the new address), the password and deleting the account (each in a dialog), a copy of the data,
 * signing out.
 */
export function AccountSettings({
  locale,
  email,
  pendingEmail,
  name,
  exportHref,
  signOutAction,
  deletedHref,
}: AccountSettingsProps) {
  const t = createTranslator(locale)

  // The name: saved once typing stops, the last value wins.
  const [nameStatus, setNameStatus] = useState<Status>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const saved = useRef(name)
  useEffect(() => () => clearTimeout(timer.current), [])
  function typeName(value: string) {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (value.trim() === saved.current.trim()) return
      setNameStatus('saving')
      const result = await api('profile', 'POST', { name: value })
      if (result.ok) saved.current = value
      setNameStatus(result.ok ? 'saved' : `error:${result.error ?? 'server'}`)
    }, NAME_DEBOUNCE_MS)
  }

  // The email: a link to the new address; until it is opened, the account keeps the old one.
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailStatus, setEmailStatus] = useState<Status>('idle')
  const [emailErrors, setEmailErrors] = useState<{ email?: string; password?: string }>({})
  const [waiting, setWaiting] = useState(pendingEmail)
  const [sentTo, setSentTo] = useState<string>()
  async function changeEmail(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setEmailErrors({})
    setEmailStatus('saving')
    const result = await api<{ email?: string }>('email', 'POST', {
      email: data.get('email'),
      password: data.get('password'),
    })
    if (result.ok) {
      setEmailStatus('idle')
      setEmailOpen(false)
      setSentTo(result.data?.email)
      setWaiting(result.data?.email)
      return
    }
    setEmailStatus('idle')
    if (result.error === 'wrong_password')
      return setEmailErrors({ password: t('account.settings.email.wrong') })
    if (fieldOf(result.error) === 'email')
      return setEmailErrors({ email: t(errorKey(result.error)) })
    setEmailStatus(`error:${result.error ?? 'server'}`)
  }

  // The password, in a dialog.
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [password, setPassword] = useState<Status>('idle')
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string }>({})
  async function changePassword(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const next = checkPassword(data.get('next'))
    const current = String(data.get('current') ?? '')
    if (current === '' || !next.ok) {
      setPasswordErrors({
        current: current === '' ? t(errorKey('password_empty')) : undefined,
        next: next.ok ? undefined : t(errorKey(`password_${next.error}`)),
      })
      return
    }
    setPasswordErrors({})
    setPassword('saving')
    const result = await api('password', 'POST', { current, next: next.password })
    if (result.ok) {
      form.reset()
      setPasswordOpen(false)
      return setPassword('saved')
    }
    if (result.error === 'wrong_password') {
      setPasswordErrors({ current: t('account.settings.password.wrong') })
      return setPassword('idle')
    }
    if (fieldOf(result.error)) {
      setPasswordErrors({ next: t(errorKey(result.error)) })
      return setPassword('idle')
    }
    setPassword(`error:${result.error ?? 'server'}`)
  }

  // Deleting the account, in a dialog that asks for the password.
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  async function deleteAccount(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeleteError(undefined)
    setDeleting(true)
    const result = await api('delete', 'POST', {
      password: new FormData(event.currentTarget).get('password'),
    })
    if (result.ok) return window.location.assign(deletedHref)
    setDeleting(false)
    if (result.error === 'wrong_password') setDeleteError(t('account.settings.delete.wrong'))
    else setDeleteError(t(errorKey(result.error)))
  }

  const errorOf = (status: Status) =>
    status.startsWith('error:') ? t(errorKey(status.slice('error:'.length))) : undefined

  return (
    <div className="grid gap-12">
      <PageHeader
        title={t('account.settings.title')}
        description={t('account.settings.signedInAs', { email })}
      />

      <section className="grid gap-4 max-w-(--container-narrow)" aria-labelledby="account-profile">
        <h2 id="account-profile" className={heading}>
          {t('account.settings.profile.title')}
        </h2>
        <TextField
          id="account-name"
          name="name"
          defaultValue={name}
          maxLength={80}
          autoComplete="given-name"
          label={t('account.common.name.label')}
          onChange={(event) => typeName(event.currentTarget.value)}
        />
        <p role="status" className="m-0 min-h-(--text-meta--line-height) text-meta text-secondary">
          {nameStatus === 'saving'
            ? t('account.settings.profile.saving')
            : nameStatus === 'saved'
              ? t('account.settings.profile.saved')
              : null}
        </p>
        {errorOf(nameStatus) ? (
          <Notice tone="danger" role="alert">
            {errorOf(nameStatus)}
          </Notice>
        ) : null}

        <div className="grid gap-2">
          <p className="m-0 text-small text-secondary">{t('account.settings.email.label')}</p>
          <p className="m-0 text-body">{email}</p>
          <div>
            <Button variant="secondary" onClick={() => setEmailOpen(true)}>
              {t('account.settings.email.change')}
            </Button>
          </div>
        </div>
        {sentTo ? (
          <Notice role="status">{t('account.settings.email.sent', { email: sentTo })}</Notice>
        ) : waiting ? (
          <Notice>{t('account.settings.email.pending', { email: waiting })}</Notice>
        ) : null}
      </section>

      <section className="grid gap-4 max-w-(--container-narrow)" aria-labelledby="account-password">
        <h2 id="account-password" className={heading}>
          {t('account.settings.password.title')}
        </h2>
        <div>
          <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
            {t('account.settings.password.change')}
          </Button>
        </div>
        {password === 'saved' ? (
          <Notice role="status">{t('account.settings.password.saved')}</Notice>
        ) : null}
      </section>

      <section className="grid gap-4 max-w-(--container-narrow)" aria-labelledby="account-data">
        <h2 id="account-data" className={heading}>
          {t('account.settings.data.title')}
        </h2>
        <p className="m-0 text-secondary">{t('account.settings.data.text')}</p>
        <div>
          <Button variant="secondary" href={exportHref}>
            {t('account.settings.data.download')}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 max-w-(--container-narrow)" aria-labelledby="account-delete">
        <h2 id="account-delete" className={heading}>
          {t('account.settings.delete.title')}
        </h2>
        <p className="m-0 text-secondary">{t('account.settings.delete.text')}</p>
        <div>
          <Button variant="secondary" onClick={() => setDeleteOpen(true)}>
            {t('account.settings.delete.start')}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 max-w-(--container-narrow)">
        <form method="post" action={signOutAction}>
          <Button type="submit" variant="secondary">
            {t('account.settings.signOut')}
          </Button>
        </form>
      </section>

      <Dialog
        open={emailOpen}
        onClose={() => {
          setEmailOpen(false)
          setEmailErrors({})
          setEmailStatus('idle')
        }}
        title={t('account.settings.email.dialogTitle')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEmailOpen(false)}>
              {t('account.settings.email.cancel')}
            </Button>
            <Button type="submit" form="account-email-form" disabled={emailStatus === 'saving'}>
              {t('account.settings.email.submit')}
            </Button>
          </>
        }
      >
        <p className="m-0">{t('account.settings.email.dialogText')}</p>
        <form
          id="account-email-form"
          method="post"
          className="grid gap-4"
          noValidate
          onSubmit={changeEmail}
        >
          <TextField
            id="account-new-email"
            name="email"
            type="email"
            autoComplete="email"
            label={t('account.settings.email.new.label')}
            error={emailErrors.email}
            onChange={() => setEmailErrors((e) => ({ ...e, email: undefined }))}
          />
          <TextField
            id="account-email-password"
            name="password"
            type="password"
            autoComplete="current-password"
            label={t('account.settings.email.password.label')}
            error={emailErrors.password}
            onChange={() => setEmailErrors((e) => ({ ...e, password: undefined }))}
          />
          {errorOf(emailStatus) ? (
            <Notice tone="danger" role="alert">
              {errorOf(emailStatus)}
            </Notice>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        open={passwordOpen}
        onClose={() => {
          setPasswordOpen(false)
          setPasswordErrors({})
          if (password !== 'saved') setPassword('idle')
        }}
        title={t('account.settings.password.dialogTitle')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setPasswordOpen(false)}>
              {t('account.settings.password.cancel')}
            </Button>
            <Button type="submit" form="account-password-form" disabled={password === 'saving'}>
              {t('account.settings.password.submit')}
            </Button>
          </>
        }
      >
        <form
          id="account-password-form"
          method="post"
          className="grid gap-4"
          noValidate
          onSubmit={changePassword}
        >
          <TextField
            id="account-current"
            name="current"
            type="password"
            autoComplete="current-password"
            label={t('account.settings.password.current.label')}
            error={passwordErrors.current}
            onChange={() => setPasswordErrors((e) => ({ ...e, current: undefined }))}
          />
          <TextField
            id="account-new"
            name="next"
            type="password"
            autoComplete="new-password"
            label={t('account.settings.password.new.label')}
            hint={t('account.common.password.hint')}
            error={passwordErrors.next}
            onChange={() => setPasswordErrors((e) => ({ ...e, next: undefined }))}
          />
          {errorOf(password) ? (
            <Notice tone="danger" role="alert">
              {errorOf(password)}
            </Notice>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteError(undefined)
        }}
        title={t('account.settings.delete.confirmTitle')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              {t('account.settings.delete.cancel')}
            </Button>
            <Button type="submit" form="account-delete-form" disabled={deleting}>
              {t('account.settings.delete.confirm')}
            </Button>
          </>
        }
      >
        <p className="m-0">{t('account.settings.delete.confirmText')}</p>
        <form
          id="account-delete-form"
          method="post"
          className="grid gap-4"
          onSubmit={deleteAccount}
        >
          <TextField
            id="account-delete-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            label={t('account.common.password.label')}
            error={deleteError}
            onChange={() => setDeleteError(undefined)}
          />
        </form>
      </Dialog>
    </div>
  )
}
