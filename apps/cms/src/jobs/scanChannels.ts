import type { TaskConfig } from 'payload'
import { runChannelScan, scanActiveChannels, type ScanAllSummary } from '../ingest/channels/scan.ts'
import { LONG_QUEUE } from './queue.ts'

/**
 * Nightly, in the jobs worker: new videos of every active official channel go to the review
 * queue, and channels whose history is not yet read continue it. With a `channelId` it scans just
 * that channel, which is how «Revisar todo el canal» runs outside the web request.
 */
export const scanChannelsTask: TaskConfig<{
  input: { channelId?: number }
  output: ScanAllSummary
}> = {
  slug: 'scanChannels',
  label: 'Scan channels',
  retries: 1,
  inputSchema: [{ name: 'channelId', type: 'number' }],
  outputSchema: [
    { name: 'channels', type: 'number', required: true },
    { name: 'failed', type: 'number', required: true },
    { name: 'added', type: 'number', required: true },
  ],
  schedule: [{ cron: '0 30 2 * * *', queue: LONG_QUEUE }],
  handler: async ({ input, req }) => {
    if (input?.channelId) {
      const channel = await req.payload.findByID({
        collection: 'channels',
        id: input.channelId,
        depth: 0,
        req,
      })
      const result = await runChannelScan(req, channel)
      return {
        output: { channels: 1, failed: result.ok ? 0 : 1, added: result.ok ? result.added : 0 },
      }
    }
    const output = await scanActiveChannels(req)
    req.payload.logger.info(
      `scanChannels: ${output.channels} channels, ${output.added} shorts added, ${output.failed} channels failed`,
    )
    return { output }
  },
}
