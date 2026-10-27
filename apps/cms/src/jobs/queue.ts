import type { PayloadRequest } from 'payload'

/** Queues a search sync for one short. The jobs worker process runs it. */
export async function queueIndexShort(req: PayloadRequest, shortId: number): Promise<void> {
  await req.payload.jobs.queue({ task: 'indexShort', input: { shortId }, req })
}

/** Queues a scan of one channel (its whole history when it is flagged). The jobs worker runs it. */
export async function queueChannelScan(req: PayloadRequest, channelId: number): Promise<void> {
  await req.payload.jobs.queue({ task: 'scanChannels', input: { channelId }, req })
}
