import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice, TextField } from '@fenaki/ui'
import { useState, type SubmitEvent } from 'react'
import { EVENTS } from '../lib/analytics.ts'
import { checkEmail } from '@fenaki/waitlist'
import { paths } from '../lib/i18n.ts'
import { rememberPending } from './WaitlistPending.tsx'

interface WaitlistFormProps {
  locale: Locale
}

type State = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'failed' }

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | boolean>) => void }
  }
}

/**
 * The waitlist form. Posts to /api/waitlist, which subscribes the address in listmonk with double
 * opt-in, and then goes to the «Revisa tu email» page, which asks the viewer to confirm from their inbox.
 */
export function WaitlistForm({ locale }: WaitlistFormProps) {
  const t = createTranslator(locale)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [fieldError, setFieldError] = useState<'empty' | 'invalid' | null>(null)

  async function send(email: string, newsletter: boolean, website = ''): Promise<boolean> {
    setState({ kind: 'submitting' })
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newsletter, locale, website }),
      })
      if (response.status === 400) {
        const { error } = (await response.json()) as { error?: 'empty' | 'invalid' }
        setFieldError(error ?? 'invalid')
        setState({ kind: 'idle' })
        return false
      }
      if (!response.ok) throw new Error(String(response.status))
      rememberPending(email)
      return true
    } catch {
      setState({ kind: 'failed' })
      return false
    }
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const checked = checkEmail(form.get('email'))
    if (!checked.ok) {
      setFieldError(checked.error)
      return
    }
    setFieldError(null)
    // Only the launch notice for now: the weekly selection is not offered on the form.
    const sent = await send(checked.email, false, String(form.get('website') ?? ''))
    if (!sent) return
    window.umami?.track(EVENTS.waitlistSignup)
    window.location.assign(paths.waitlistPending(locale))
  }

  const submitting = state.kind === 'submitting'
  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <TextField
        id="waitlist-email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        label={t('waitlist.email.label')}
        placeholder={t('waitlist.email.placeholder')}
        // The visible label is a question and the instruction is the placeholder, which goes as you
        // type: the field's name carries both, starting with the visible label (WCAG 2.5.3).
        aria-label={`${t('waitlist.email.label')} ${t('waitlist.email.placeholder')}`}
        error={fieldError ? t(`waitlist.error.${fieldError}`) : undefined}
        onChange={() => setFieldError(null)}
        action={
          <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
            {submitting ? t('waitlist.submitting') : t('waitlist.submit')}
          </Button>
        }
      />
      {/* A field people never see: bots fill it in, and the server ignores those requests. */}
      <div aria-hidden="true" className="hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state.kind === 'failed' ? (
        <Notice tone="danger" role="alert">
          {t('waitlist.error.server')}
        </Notice>
      ) : null}
    </form>
  )
}
