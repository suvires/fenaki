import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * The first embeddings again: the job the previous migration queued was taken by the worker of the
 * version before, which did not know the task yet, and failed.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  await payload.jobs.queue({ task: 'embedShorts', input: {}, queue: 'long', req })
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
