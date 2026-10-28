import { createRichTranslator, createTranslator, type Locale, type MessageKey } from '@fenaki/i18n'
import {
  Button,
  Checkbox,
  Notice,
  SelectField,
  SubmissionItem,
  TextField,
  type BadgeTone,
} from '@fenaki/ui'
import { Fragment, useState, type SubmitEvent } from 'react'
import { api } from '../lib/accountClient.ts'
import { errorKey } from '../lib/accountErrors.ts'
import {
  SUBMIT_ERRORS,
  type Submission,
  type SubmissionStatus,
} from '../lib/account/submissions.ts'

const RELATIONS = [
  'author',
  'producer',
  'distributor',
  'festival',
  'school',
  'institution',
] as const

/** Errors about one field, shown under it; the rest go in a notice. */
const FIELD_ERRORS: Record<string, 'url' | 'relation' | 'terms'> = {
  invalid_url: 'url',
  already_in_catalog: 'url',
  already_submitted: 'url',
  broken: 'url',
  private: 'url',
  not_embeddable: 'url',
  age_restricted: 'url',
  invalid_relation: 'relation',
  terms: 'terms',
}

const TONES: Record<SubmissionStatus, BadgeTone> = {
  'awaiting-code': 'accent',
  'in-review': 'info',
  approved: 'info',
  rejected: 'neutral',
}

interface SubmitShortProps {
  locale: Locale
  termsHref: string
  initial: Submission[]
}

/**
 * «Sube tu corto»: the form that sends a YouTube or Vimeo URL, and the member's submissions with
 * the code each one waits for and the button that checks it.
 */
export function SubmitShort({ locale, termsHref, initial }: SubmitShortProps) {
  const t = createTranslator(locale)
  const rich = createRichTranslator(locale)
  const [submissions, setSubmissions] = useState(initial)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ url?: string; relation?: string; terms?: string }>({})
  const [failure, setFailure] = useState<string>()
  const [checking, setChecking] = useState<number>()
  const [checkErrors, setCheckErrors] = useState<Record<number, string>>({})
  const [copied, setCopied] = useState<number>()

  const message = (code: string | undefined) =>
    SUBMIT_ERRORS.some((known) => known === code)
      ? t(`submit.error.${code}` as MessageKey)
      : t(errorKey(code))

  const upsert = (submission: Submission) =>
    setSubmissions((current) => [
      submission,
      ...current.filter((other) => other.id !== submission.id),
    ])

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const url = String(data.get('url') ?? '').trim()
    const relation = String(data.get('relation') ?? '')
    const acceptTerms = data.get('terms') === 'on'
    const missing = {
      url: url ? undefined : t('submit.error.invalid_url'),
      relation: relation ? undefined : t('submit.error.invalid_relation'),
      terms: acceptTerms ? undefined : t('submit.error.terms'),
    }
    setErrors(missing)
    setFailure(undefined)
    if (missing.url || missing.relation || missing.terms) return
    setSubmitting(true)
    const result = await api<{ submission: Submission }>('submissions', 'POST', {
      url,
      relation,
      acceptTerms,
    })
    setSubmitting(false)
    if (result.ok && result.data) {
      upsert(result.data.submission)
      form.reset()
      return
    }
    const field = result.error ? FIELD_ERRORS[result.error] : undefined
    if (field) setErrors({ [field]: message(result.error) })
    else setFailure(message(result.error))
  }

  async function verify(id: number) {
    setChecking(id)
    setCheckErrors(({ [id]: _, ...rest }) => rest)
    const result = await api<{ submission: Submission }>('submissions-verify', 'POST', { id })
    setChecking(undefined)
    if (result.ok && result.data) upsert(result.data.submission)
    else setCheckErrors((current) => ({ ...current, [id]: message(result.error) }))
  }

  async function copy(submission: Submission) {
    try {
      await navigator.clipboard.writeText(submission.code)
      setCopied(submission.id)
    } catch {
      // The code is selectable on screen: copying by hand still works.
    }
  }

  const text = (submission: Submission) => {
    if (submission.status === 'awaiting-code') return t('submit.list.code')
    if (submission.status === 'rejected')
      return submission.reason ? t('submit.list.reason', { reason: submission.reason }) : undefined
    return t(`submit.statusText.${submission.status}`)
  }

  return (
    <div className="grid gap-10">
      <form method="post" className="grid gap-4" noValidate onSubmit={submit}>
        <h2 className="m-0 text-title">{t('submit.form.title')}</h2>
        <TextField
          id="submit-url"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="off"
          required
          label={t('submit.form.url.label')}
          placeholder={t('submit.form.url.placeholder')}
          hint={t('submit.form.url.hint')}
          error={errors.url}
          onChange={() => setErrors((current) => ({ ...current, url: undefined }))}
        />
        <SelectField
          id="submit-relation"
          name="relation"
          required
          defaultValue=""
          label={t('submit.form.relation.label')}
          placeholder={t('submit.form.relation.placeholder')}
          options={RELATIONS.map((value) => ({
            value,
            label: t(`submit.form.relations.${value}`),
          }))}
          error={errors.relation}
          onChange={() => setErrors((current) => ({ ...current, relation: undefined }))}
        />
        <div className="grid gap-2">
          <Checkbox
            id="submit-terms"
            name="terms"
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={errors.terms ? 'submit-terms-error' : undefined}
            onChange={() => setErrors((current) => ({ ...current, terms: undefined }))}
          >
            {rich('submit.form.terms', {
              terms: (
                <a
                  className="text-primary underline underline-offset-4 hover:no-underline"
                  href={termsHref}
                >
                  {t('submit.form.termsLink')}
                </a>
              ),
            }).map((part, index) => (
              <Fragment key={index}>{part}</Fragment>
            ))}
          </Checkbox>
          {errors.terms ? (
            <p id="submit-terms-error" className="m-0 text-small text-danger">
              {errors.terms}
            </p>
          ) : null}
        </div>
        <div>
          <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
            {submitting ? t('account.common.working') : t('submit.form.submit')}
          </Button>
        </div>
        {failure ? (
          <Notice tone="danger" role="alert">
            {failure}
          </Notice>
        ) : null}
      </form>

      <section aria-labelledby="submissions" className="grid gap-4">
        <h2 id="submissions" className="m-0 text-title">
          {t('submit.list.title')}
        </h2>
        {submissions.length === 0 ? (
          <p className="m-0 text-body text-secondary">{t('submit.list.empty')}</p>
        ) : (
          <ul className="m-0 p-0 list-none grid gap-3">
            {submissions.map((submission) => {
              const waiting = submission.status === 'awaiting-code'
              const busy = checking === submission.id
              return (
                <li key={submission.id} className="grid gap-2">
                  <SubmissionItem
                    title={submission.videoTitle || submission.url}
                    href={submission.url}
                    status={t(`submit.status.${submission.status}`)}
                    statusTone={TONES[submission.status]}
                    text={text(submission)}
                    code={waiting ? submission.code : undefined}
                    actions={
                      waiting ? (
                        <>
                          <Button variant="secondary" onClick={() => copy(submission)}>
                            {copied === submission.id
                              ? t('submit.list.copied')
                              : t('submit.list.copy')}
                          </Button>
                          <Button
                            onClick={() => verify(submission.id)}
                            disabled={busy}
                            aria-busy={busy}
                          >
                            {busy ? t('account.common.working') : t('submit.list.verify')}
                          </Button>
                        </>
                      ) : undefined
                    }
                  />
                  {checkErrors[submission.id] ? (
                    <Notice tone="danger" role="alert">
                      {checkErrors[submission.id]}
                    </Notice>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
