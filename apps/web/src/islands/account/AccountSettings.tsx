import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice, PageHeader, TextField } from '@fenaki/ui'
import { useState, type SubmitEvent } from 'react'
import { api } from '../../lib/accountClient.ts'
import { errorKey, fieldOf } from '../../lib/accountErrors.ts'
import { checkPassword } from '../../lib/account/rules.ts'

interface AccountSettingsProps {
  locale: Locale
  email: string
  name: string
  exportHref: string
  signOutAction: string
  /** Where to go once the account is deleted. */
  deletedHref: string
}

const heading = 'm-0 font-display text-title uppercase'

/** The account page: name, password, a copy of the data, deleting the account, signing out. */
export function AccountSettings({
  locale,
  email,
  name,
  exportHref,
  signOutAction,
  deletedHref,
}: AccountSettingsProps) {
  const t = createTranslator(locale)

  const [profile, setProfile] = useState<'idle' | 'saving' | 'saved' | string>('idle')
  async function saveProfile(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfile('saving')
    const result = await api('profile', 'POST', {
      name: new FormData(event.currentTarget).get('name'),
    })
    setProfile(result.ok ? 'saved' : `error:${result.error ?? 'server'}`)
  }

  const [password, setPassword] = useState<'idle' | 'saving' | 'saved' | string>('idle')
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

  const [deleting, setDeleting] = useState<'idle' | 'confirm' | 'working' | string>('idle')
  const [deleteError, setDeleteError] = useState<string>()
  async function deleteAccount(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeleteError(undefined)
    setDeleting('working')
    const result = await api('delete', 'POST', {
      password: new FormData(event.currentTarget).get('password'),
    })
    if (result.ok) return window.location.assign(deletedHref)
    if (result.error === 'wrong_password') setDeleteError(t('account.settings.delete.wrong'))
    else setDeleteError(t(errorKey(result.error)))
    setDeleting('confirm')
  }

  return (
    <div className="grid gap-12">
      <PageHeader
        title={t('account.settings.title')}
        description={t('account.settings.signedInAs', { email })}
      />

      <section className="grid gap-4 max-w-(--container-note)" aria-labelledby="account-profile">
        <h2 id="account-profile" className={heading}>
          {t('account.settings.profile.title')}
        </h2>
        <form method="post" className="grid gap-4" onSubmit={saveProfile}>
          <TextField
            id="account-name"
            name="name"
            defaultValue={name}
            maxLength={80}
            autoComplete="given-name"
            label={t('account.common.name.label')}
            hint={t('account.common.name.hint')}
          />
          <div>
            <Button type="submit" variant="secondary" disabled={profile === 'saving'}>
              {t('account.settings.profile.submit')}
            </Button>
          </div>
          {profile === 'saved' ? (
            <Notice role="status">{t('account.settings.profile.saved')}</Notice>
          ) : null}
          {profile.startsWith('error:') ? (
            <Notice tone="danger" role="alert">
              {t(errorKey(profile.slice(6)))}
            </Notice>
          ) : null}
        </form>
      </section>

      <section className="grid gap-4 max-w-(--container-note)" aria-labelledby="account-password">
        <h2 id="account-password" className={heading}>
          {t('account.settings.password.title')}
        </h2>
        <form method="post" className="grid gap-4" noValidate onSubmit={changePassword}>
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
          <div>
            <Button type="submit" variant="secondary" disabled={password === 'saving'}>
              {t('account.settings.password.submit')}
            </Button>
          </div>
          {password === 'saved' ? (
            <Notice role="status">{t('account.settings.password.saved')}</Notice>
          ) : null}
          {password.startsWith('error:') ? (
            <Notice tone="danger" role="alert">
              {t(errorKey(password.slice(6)))}
            </Notice>
          ) : null}
        </form>
      </section>

      <section className="grid gap-4 max-w-(--container-note)" aria-labelledby="account-data">
        <h2 id="account-data" className={heading}>
          {t('account.settings.data.title')}
        </h2>
        <p className="m-0 text-ink-muted">{t('account.settings.data.text')}</p>
        <div>
          <Button variant="secondary" href={exportHref}>
            {t('account.settings.data.download')}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 max-w-(--container-note)" aria-labelledby="account-delete">
        <h2 id="account-delete" className={heading}>
          {t('account.settings.delete.title')}
        </h2>
        <p className="m-0 text-ink-muted">{t('account.settings.delete.text')}</p>
        {deleting === 'idle' ? (
          <div>
            <Button variant="secondary" onClick={() => setDeleting('confirm')}>
              {t('account.settings.delete.start')}
            </Button>
          </div>
        ) : (
          <form method="post" onSubmit={deleteAccount}>
            <Notice tone="danger" title={t('account.settings.delete.confirmTitle')}>
              <p className="m-0">{t('account.settings.delete.confirmText')}</p>
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
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={deleting === 'working'}>
                  {t('account.settings.delete.confirm')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDeleting('idle')
                    setDeleteError(undefined)
                  }}
                >
                  {t('account.settings.delete.cancel')}
                </Button>
              </div>
            </Notice>
          </form>
        )}
      </section>

      <section className="grid gap-4 max-w-(--container-note)">
        <form method="post" action={signOutAction}>
          <Button type="submit" variant="secondary">
            {t('account.settings.signOut')}
          </Button>
        </form>
      </section>
    </div>
  )
}
