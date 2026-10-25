/**
 * Runs before the jobs worker starts (`shortix jobs` in the production image). Payload's worker
 * stops at once on SIGTERM, so a deploy can cut a job short and leave it marked as processing,
 * and Payload never picks such a job again. Only one worker runs, so when it starts, every job
 * still processing was interrupted: they go back to the queue. Jobs here are idempotent.
 *
 *   payload run src/jobs/releaseInterrupted.ts
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const payload = await getPayload({ config })
const { docs } = await payload.update({
  collection: 'payload-jobs',
  where: { processing: { equals: true } },
  data: { processing: false },
  overrideAccess: true,
})
if (docs.length > 0) payload.logger.info(`jobs: released ${docs.length} interrupted job(s)`)
process.exit(0)
