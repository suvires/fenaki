import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** The embed check and the channel scans already waiting move to the queue of the long jobs. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "payload_jobs" SET "queue" = 'long'
    WHERE "task_slug" IN ('checkEmbeds', 'scanChannels') AND "completed_at" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "payload_jobs" SET "queue" = 'default'
    WHERE "task_slug" IN ('checkEmbeds', 'scanChannels') AND "completed_at" IS NULL;`)
}
