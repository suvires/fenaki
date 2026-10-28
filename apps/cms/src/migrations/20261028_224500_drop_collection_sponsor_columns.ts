import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * The sponsor columns that collections had before sponsored collections became their own
 * collection (20261028_103200): no field reads them, and their data was copied there.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "collections" DROP COLUMN IF EXISTS "sponsor_id";
  ALTER TABLE "collections" DROP COLUMN IF EXISTS "sponsorship_starts_at";
  ALTER TABLE "collections" DROP COLUMN IF EXISTS "sponsorship_ends_at";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "sponsor_id" integer;
  ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "sponsorship_starts_at" timestamp(3) with time zone;
  ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "sponsorship_ends_at" timestamp(3) with time zone;`)
}
