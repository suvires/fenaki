import { createRichTranslator, createTranslator, type Locale, type MessageKey } from '@fenaki/i18n'
import { Button, Checkbox, Notice, SelectField, TextField } from '@fenaki/ui'
import { Fragment, useState, type SubmitEvent } from 'react'
import { api } from '../lib/accountClient.ts'
import { errorKey } from '../lib/accountErrors.ts'
import { SUBMIT_ERRORS } from '../lib/account/submissions.ts'

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

interface SubmitShortProps {
  locale: Locale
  termsHref: string
  mySubmissionsHref: string
}

/** «Sube tu corto»: the form that sends a YouTube or Vimeo URL. «Mis envíos» lists them. */
export function SubmitShort({ locale, termsHref, mySubmissionsHref }: SubmitShortProps) {
  const t = createTranslator(locale)
  const rich = createRichTranslator(locale)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ url?: string; relation?: string; terms?: string }>({})
  const [failure, setFailure] = useState<string>()

  const message = (code: string | undefined) =>
    SUBMIT_ERRORS.some((known) => known === code)
      ? t(`submit.error.${code}` as MessageKey)
      : t(errorKey(code))

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
    const result = await api('submissions', 'POST', {
      url,
      relation,
      acceptTerms,
    })
    setSubmitting(false)
    if (result.ok) {
      form.reset()
      setSent(true)
      return
    }
    const field = result.error ? FIELD_ERRORS[result.error] : undefined
    if (field) setErrors({ [field]: message(result.error) })
    else setFailure(message(result.error))
  }

  if (sent)
    return (
      <Notice role="status" title={t('submit.sent.title')}>
        <p className="m-0">
          {rich('submit.sent.text', {
            mySubmissions: (
              <a
                className="text-primary underline underline-offset-4 hover:no-underline"
                href={mySubmissionsHref}
              >
                {t('submit.sent.link')}
              </a>
            ),
          }).map((part, index) => (
            <Fragment key={index}>{part}</Fragment>
          ))}
        </p>
        <div className="pt-2">
          <Button variant="secondary" onClick={() => setSent(false)}>
            {t('submit.list.submitAnother')}
          </Button>
        </div>
      </Notice>
    )

  return (
    <form method="post" className="grid gap-4" noValidate onSubmit={submit}>
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
  )
}
