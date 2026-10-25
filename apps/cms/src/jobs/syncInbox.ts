import type { TaskConfig } from 'payload'
import { syncInbox } from '../crm/inbox/sync.ts'

/**
 * Every 5 minutes, in the jobs worker: reads the CRM mailbox (IMAP, read-only) and stores the
 * replies that belong to the CRM. Off while the MAILBOX_IMAP_* settings are empty. A failure is
 * recorded on the inbox state and the next run tries again from the same UID.
 */
export const syncInboxTask: TaskConfig<{
  input: Record<string, never>
  output: { stored: number; seen: number; skipped: boolean }
}> = {
  slug: 'syncInbox',
  label: 'Sync the CRM inbox',
  retries: 0,
  outputSchema: [
    { name: 'stored', type: 'number', required: true },
    { name: 'seen', type: 'number', required: true },
    { name: 'skipped', type: 'checkbox', required: true },
  ],
  schedule: [{ cron: '0 */5 * * * *', queue: 'default' }],
  handler: async ({ req }) => {
    try {
      const summary = await syncInbox(req.payload)
      if (summary.stored > 0)
        req.payload.logger.info(
          `syncInbox: ${summary.stored} replies stored (${summary.seen} new messages)`,
        )
      return {
        output: { stored: summary.stored, seen: summary.seen, skipped: Boolean(summary.skipped) },
      }
    } catch (error) {
      const message = String((error as Error).message).slice(0, 300)
      req.payload.logger.error(`syncInbox: ${message}`)
      await req.payload
        .updateGlobal({
          slug: 'crm-inbox',
          data: { lastRunAt: new Date().toISOString(), lastError: message },
          overrideAccess: true,
        })
        .catch(() => {})
      return { output: { stored: 0, seen: 0, skipped: false } }
    }
  },
}
