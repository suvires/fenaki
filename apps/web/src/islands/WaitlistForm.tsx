import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Notice, TextField } from '@fenaki/ui'
import { useState, type SubmitEvent } from 'react'
import { EVENTS } from '../lib/analytics.ts'
import { checkEmail, type SignupKind } from '@fenaki/waitlist'
import { paths } from '../lib/i18n.ts'
import { rememberPending } from './WaitlistPending.tsx'

interface WaitlistFormProps {
  locale: Locale
  /** The landing page's launch notice, or the weekly selection once the catalog is open. */
  kind?: SignupKind
}

type State = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'failed' }

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string | boolean>) => void }
  }
}

const COPY = {
  launch: {
    label: 'waitlist.email.label',
    placeholder: 'waitlist.email.placeholder',
    submit: 'waitlist.submit',
    submitting: 'waitlist.submitting',
    error: {
      empty: 'waitlist.error.empty',
      invalid: 'waitlist.error.invalid',
      server: 'waitlist.error.server',
    },
    event: EVENTS.waitlistSignup,
  },
  weekly: {
    label: 'newsletter.email.label',
    placeholder: 'newsletter.email.placeholder',
    submit: 'newsletter.submit',
    submitting: 'newsletter.submitting',
    error: {
      empty: 'newsletter.error.empty',
      invalid: 'newsletter.error.invalid',
      server: 'newsletter.error.server',
    },
    event: EVENTS.newsletterSignup,
  },
} as const

/**
 * The signup form: the launch waitlist or the weekly selection. Posts to /api/waitlist, which
 * subscribes the address in listmonk with double opt-in, and then goes to the «Revisa tu email»
 * page, which asks the viewer to confirm from their inbox.
 */
export function WaitlistForm({ locale, kind = 'launch' }: WaitlistFormProps) {
  const t = createTranslator(locale)
  const copy = COPY[kind]
  const fieldId = kind === 'launch' ? 'waitlist-email' : 'newsletter-email'
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
    // The launch form offers only the launch notice; the weekly form is only the selection.
    const sent = await send(checked.email, kind === 'weekly', String(form.get('website') ?? ''))
    if (!sent) return
    window.umami?.track(copy.event)
    window.location.assign(paths.waitlistPending(locale))
  }

  const submitting = state.kind === 'submitting'
  return (
    <form className="grid gap-4" noValidate onSubmit={submit}>
      <TextField
        id={fieldId}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        label={t(copy.label)}
        placeholder={t(copy.placeholder)}
        // The visible label is a question and the instruction is the placeholder, which goes as you
        // type: the field's name carries both, starting with the visible label (WCAG 2.5.3).
        aria-label={`${t(copy.label)} ${t(copy.placeholder)}`}
        error={fieldError ? t(copy.error[fieldError]) : undefined}
        onChange={() => setFieldError(null)}
        action={
          <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
            {submitting ? t(copy.submitting) : t(copy.submit)}
          </Button>
        }
      />
      {/* A field people never see: bots fill it in, and the server ignores those requests. */}
      <div aria-hidden="true" className="hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state.kind === 'failed' ? (
        <Notice tone="danger" role="alert">
          {t(copy.error.server)}
        </Notice>
      ) : null}
    </form>
  )
}
