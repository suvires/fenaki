import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/** The first embeddings of the whole catalog, by the long-jobs worker (a no-op without the key). */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  await payload.jobs.queue({ task: 'embedShorts', input: {}, queue: 'long', req })
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
