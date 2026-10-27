import type { TaskConfig } from 'payload'
import { scanActiveChannels, type ScanAllSummary } from '../ingest/channels/scan.ts'

/**
 * Nightly, in the jobs worker: new videos of every active official channel go to the review
 * queue. Editors can also scan one channel from its page in the admin panel.
 */
export const scanChannelsTask: TaskConfig<{
  input: Record<string, never>
  output: ScanAllSummary
}> = {
  slug: 'scanChannels',
  label: 'Scan channels',
  retries: 1,
  outputSchema: [
    { name: 'channels', type: 'number', required: true },
    { name: 'failed', type: 'number', required: true },
    { name: 'added', type: 'number', required: true },
  ],
  schedule: [{ cron: '0 30 2 * * *', queue: 'default' }],
  handler: async ({ req }) => {
    const output = await scanActiveChannels(req)
    req.payload.logger.info(
      `scanChannels: ${output.channels} channels, ${output.added} shorts added, ${output.failed} channels failed`,
    )
    return { output }
  },
}
