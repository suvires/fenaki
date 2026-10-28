/** «Sube tu corto»: a member's submissions, as the CMS returns them (submissions/submit.ts). */
export type SubmissionStatus = 'in-review' | 'approved' | 'rejected'

export interface Submission {
  id: number
  videoTitle: string
  url: string
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
] as const
export type SubmitError = (typeof SUBMIT_ERRORS)[number] | 'server' | 'signed_out' | 'rate_limited'

export const submitError = (error: unknown): SubmitError =>
  SUBMIT_ERRORS.find((known) => known === error) ?? 'server'

/** How the list shows each state: its badge tone. */
export const STATUS_TONES = {
  'in-review': 'info',
  approved: 'info',
  rejected: 'neutral',
} as const satisfies Record<SubmissionStatus, 'info' | 'neutral'>
