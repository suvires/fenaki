import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members" ADD COLUMN "pending_email" varchar;
  ALTER TABLE "members" ADD COLUMN "pending_email_token" varchar;
  ALTER TABLE "members" ADD COLUMN "pending_email_expires_at" timestamp(3) with time zone;
  CREATE INDEX "members_pending_email_token_idx" ON "members" USING btree ("pending_email_token");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "members_pending_email_token_idx";
  ALTER TABLE "members" DROP COLUMN "pending_email";
  ALTER TABLE "members" DROP COLUMN "pending_email_token";
  ALTER TABLE "members" DROP COLUMN "pending_email_expires_at";`)
}
