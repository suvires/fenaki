import { cms } from '../../../lib/account/payload.ts'
import { accountRoute, fail, json } from '../../../lib/account/route.ts'
import { submitError, type Submission } from '../../../lib/account/submissions.ts'

/** Looks for the code in the video's description: found, the submission goes to review. */
export const POST = accountRoute({ limit: 'submit', member: true }, async ({ body, member }) => {
  const id = Number(body.id)
  if (!Number.isInteger(id) || id < 1) return fail('not_found', 404)
  const result = await cms<Submission & { error?: string }>('submissions/verify', {
    method: 'POST',
    token: member.token,
    body: { id },
  })
  if (result.status === 401 || result.status === 403) return fail('signed_out', 401)
  if (result.status === 200 && result.data) return json({ submission: result.data })
  const error = submitError(result.data?.error)
  return fail(error, error === 'server' ? 503 : result.status)
})
