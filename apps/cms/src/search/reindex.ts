/**
 * Rebuilds the search indexes from the database: queues a sync for every short and runs it, which
 * also applies the current index settings. Run after changing the search document or its
 * settings: `pnpm --filter @fenaki/cms reindex`.
 */
import config from '@payload-config'
import { getPayload } from 'payload'
import { runSearchSync } from '../seed/shared.ts'

const payload = await getPayload({ config })
const shorts = await payload.find({
  collection: 'shorts',
  depth: 0,
  limit: 0,
  pagination: false,
  select: {},
})
for (const short of shorts.docs)
  await payload.jobs.queue({ task: 'indexShort', input: { shortId: short.id } })
payload.logger.info(`reindex: queued ${shorts.docs.length} shorts`)
await runSearchSync(payload, (message) => payload.logger.info(`reindex: ${message}`))
process.exit(0)
