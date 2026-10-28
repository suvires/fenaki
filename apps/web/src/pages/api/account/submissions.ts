import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { submitError, type Submission } from '../../../lib/account/submissions.ts'

/** The signed-in member's submissions from «Sube tu corto». */
export const GET = accountRoute({ limit: 'session', member: true }, async ({ member }) => {
  const result = await cms<{ docs: Submission[] }>('submissions/mine', { token: member.token })
  if (result.status === 401 || result.status === 403) return fail('signed_out', 401)
  if (result.status !== 200 || !result.data) return fail('server', 503)
  return json({ submissions: result.data.docs })
})

/** Sends a YouTube or Vimeo URL; the answer carries the code for the video's description. */
export const POST = accountRoute({ limit: 'submit', member: true }, async ({ body, member }) => {
  const result = await cms<Submission & { error?: string }>('submissions/submit', {
    method: 'POST',
    token: member.token,
    body: {
      url: typeof body.url === 'string' ? body.url.slice(0, 500) : '',
      relation: body.relation,
      acceptTerms: body.acceptTerms === true,
    },
  })
  if (result.status === 401 || result.status === 403) return fail('signed_out', 401)
  if (result.status === 201 && result.data) return json({ submission: result.data }, 201)
  const error = submitError(result.data?.error)
  return fail(error, error === 'server' ? 503 : result.status)
})
