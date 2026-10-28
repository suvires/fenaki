/** «Sube tu corto»: a member's submissions, as the CMS returns them (submissions/submit.ts). */
export type SubmissionStatus = 'awaiting-code' | 'in-review' | 'approved' | 'rejected'

export interface Submission {
  id: number
  videoTitle: string
  url: string
  code: string
  status: SubmissionStatus
  reason: string | null
  createdAt: string
}

/** The CMS's errors the form explains; anything else is `server`. */
export const SUBMIT_ERRORS = [
  'invalid_url',
  'invalid_relation',
  'terms',
  'already_in_catalog',
  'already_submitted',
  'too_many',
  'unreachable',
  'broken',
  'private',
  'not_embeddable',
  'age_restricted',
  'not_found',
  'code_not_found',
  'unverifiable',
] as const
export type SubmitError = (typeof SUBMIT_ERRORS)[number] | 'server' | 'signed_out' | 'rate_limited'

export const submitError = (error: unknown): SubmitError =>
  SUBMIT_ERRORS.find((known) => known === error) ?? 'server'
