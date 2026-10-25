import { createListmonk, purgeExpired } from '@shortix/waitlist'
import type { TaskConfig } from 'payload'

/**
 * Daily, in the jobs worker: removes waitlist signups whose confirmation link expired, as the
 * confirmation email promises. The waitlist itself lives in listmonk.
 */
export const purgeWaitlistTask: TaskConfig<{
  input: Record<string, never>
  output: { deleted: number; unsubscribed: number }
}> = {
  slug: 'purgeWaitlist',
  label: 'Remove expired waitlist signups',
  retries: 2,
  outputSchema: [
    { name: 'deleted', type: 'number', required: true },
    { name: 'unsubscribed', type: 'number', required: true },
  ],
  schedule: [{ cron: '0 0 4 * * *', queue: 'default' }],
  handler: async ({ req }) => {
    const token = process.env.LISTMONK_API_TOKEN
    if (!token) {
      req.payload.logger.warn('purgeWaitlist: LISTMONK_API_TOKEN is not set, nothing to do')
      return { output: { deleted: 0, unsubscribed: 0 } }
    }
    const client = createListmonk({
      url: process.env.LISTMONK_URL ?? 'http://localhost:9000',
      user: process.env.LISTMONK_API_USER ?? 'shortix-web',
      token,
    })
    const output = await purgeExpired(client)
    req.payload.logger.info(
      `purgeWaitlist: ${output.deleted} subscribers deleted, ${output.unsubscribed} unsubscribed`,
    )
    return { output }
  },
}
