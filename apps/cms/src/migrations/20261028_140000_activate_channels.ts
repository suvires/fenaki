import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * The nightly scan looks at every registered channel again: new videos go to the review queue.
 * The AI review stays off (AI_REVIEW_AUTO): editors review what comes in.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`UPDATE "channels" SET "active" = true WHERE "active" = false;`)
}

/** Nothing to undo by itself: channels are switched off one by one in the admin panel. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
