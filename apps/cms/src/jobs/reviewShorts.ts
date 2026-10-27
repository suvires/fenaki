import type { TaskConfig } from 'payload'
import { runBatchReview, type BatchSummary } from '../ai/batch.ts'
import { aiConfigured, analyzeShort, autoReview, reviewClient } from '../ai/review.ts'

/**
 * Right after a short enters the review queue: one normal request, so the editor finds the
 * proposal when they open it. Does nothing without ANTHROPIC_API_KEY. A rate limit or an
 * outage throws, and the queue tries again.
 */
export const reviewShortTask: TaskConfig<{
  input: { shortId: number }
  output: { analyzed: boolean }
}> = {
  slug: 'reviewShort',
  label: 'AI review of a short',
  retries: 3,
  inputSchema: [{ name: 'shortId', type: 'number', required: true }],
  outputSchema: [{ name: 'analyzed', type: 'checkbox', required: true }],
  handler: async ({ input, req }) => {
    if (!aiConfigured()) return { output: { analyzed: false } }
    const reviewed = await analyzeShort(req, input.shortId)
    return { output: { analyzed: reviewed !== null } }
  },
}

/**
 * Nightly at 04:00, after the channel scan (02:30) and the embed check (03:00): collects the
 * batches that ended and sends the shorts in review that have no analysis as a new one, at half
 * the price of single requests. Does nothing without ANTHROPIC_API_KEY.
 */
export const reviewBacklogTask: TaskConfig<{
  input: Record<string, never>
  output: Omit<BatchSummary, 'usage'>
}> = {
  slug: 'reviewBacklog',
  label: 'AI review of the review queue',
  retries: 1,
  outputSchema: [
    { name: 'submitted', type: 'number', required: true },
    { name: 'collected', type: 'number', required: true },
    { name: 'pending', type: 'number', required: true },
  ],
  schedule: [{ cron: '0 0 4 * * *', queue: 'default' }],
  handler: async ({ req }) => {
    const client = reviewClient()
    if (!client) return { output: { submitted: 0, collected: 0, pending: 0 } }
    const { submitted, collected, pending } = await runBatchReview(req, client, autoReview())
    return { output: { submitted, collected, pending } }
  },
}
