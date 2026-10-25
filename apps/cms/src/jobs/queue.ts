import type { PayloadRequest } from 'payload'

/** Queues a search sync for one short. The jobs worker process runs it. */
export async function queueIndexShort(req: PayloadRequest, shortId: number): Promise<void> {
  await req.payload.jobs.queue({ task: 'indexShort', input: { shortId }, req })
}
