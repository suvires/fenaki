import type { PayloadRequest } from 'payload'

/** Queues a search sync for one short. The jobs worker process runs it. */
export async function queueIndexShort(req: PayloadRequest, shortId: number): Promise<void> {
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
  if (!process.env.ANTHROPIC_API_KEY) return
  await req.payload.jobs.queue({ task: 'reviewShort', input: { shortId }, req })
}
