import { autoReview } from '../ai/review.ts'
import type { PayloadRequest } from 'payload'

/**
 * Queues a search sync for one short, unless one is already waiting: it reads the short when it
 * runs, so one is enough. (The nightly embed check touches every short; without this the queue
 * filled with copies that kept the other jobs waiting.) The jobs worker process runs it.
 */
export async function queueIndexShort(req: PayloadRequest, shortId: number): Promise<void> {
  const waiting = await req.payload.count({
    collection: 'payload-jobs',
    where: {
      taskSlug: { equals: 'indexShort' },
      'input.shortId': { equals: shortId },
      completedAt: { exists: false },
      processing: { equals: false },
    },
    req,
  })
  if (waiting.totalDocs > 0) return
  await req.payload.jobs.queue({ task: 'indexShort', input: { shortId }, req })
}

/** Queues a scan of one channel (its whole history when it is flagged). The jobs worker runs it. */
export async function queueChannelScan(req: PayloadRequest, channelId: number): Promise<void> {
  await req.payload.jobs.queue({ task: 'scanChannels', input: { channelId }, req })
}

/**
 * Queues the AI review of a short that just entered the review queue. A no-op without
 * ANTHROPIC_API_KEY, so the rest of the pipeline never depends on it.
 */
export async function queueShortReview(req: PayloadRequest, shortId: number): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY || !autoReview()) return
  await req.payload.jobs.queue({ task: 'reviewShort', input: { shortId }, req })
}
