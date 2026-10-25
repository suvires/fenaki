import { createRichTranslator, createTranslator, type Locale } from '@shortix/i18n'
import { Button, Checkbox, Notice, TextField } from '@shortix/ui'
import { Fragment, useState, type SubmitEvent } from 'react'
import { EVENTS } from '../lib/analytics.ts'
import { checkEmail } from '../lib/waitlist.ts'

interface WaitlistFormProps {
  locale: Locale
}

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'pending'; email: string; newsletter: boolean }
  | { kind: 'failed' }

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | boolean>) => void }
  }
}

/**
 * The waitlist form. Posts to /api/waitlist, which subscribes the address in listmonk with double
 * opt-in, and then asks the viewer to confirm from their inbox.
 */
export function WaitlistForm({ locale }: WaitlistFormProps) {
  const t = createTranslator(locale)
  const rich = createRichTranslator(locale)
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
      setState({ kind: 'pending', email, newsletter })
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
    const newsletter = form.get('newsletter') === 'on'
    const sent = await send(checked.email, newsletter, String(form.get('website') ?? ''))
    if (sent) window.umami?.track(EVENTS.waitlistSignup, { newsletter })
  }

  if (state.kind === 'pending') {
    return (
      <Notice role="status" title={t('waitlist.pending.title')}>
        <p className="m-0">
          {rich('waitlist.pending.text', {
            email: <strong className="text-ink">{state.email}</strong>,
          }).map((part, index) => (
            <Fragment key={index}>{part}</Fragment>
          ))}
        </p>
        <p className="m-0">{t('waitlist.pending.help')}</p>
        <div>
          <Button variant="secondary" onClick={() => send(state.email, state.newsletter)}>
            {t('waitlist.pending.resend')}
          </Button>
        </div>
      </Notice>
    )
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
        error={fieldError ? t(`waitlist.error.${fieldError}`) : undefined}
        onChange={() => setFieldError(null)}
      />
      <Checkbox id="waitlist-newsletter" name="newsletter">
        {t('waitlist.newsletter.label')}
      </Checkbox>
      {/* A field people never see: bots fill it in, and the server ignores those requests. */}
      <div aria-hidden="true" className="hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
          {submitting ? t('waitlist.submitting') : t('waitlist.submit')}
        </Button>
      </div>
      {state.kind === 'failed' ? (
        <Notice tone="danger" role="alert">
          {t('waitlist.error.server')}
        </Notice>
      ) : null}
    </form>
  )
}
