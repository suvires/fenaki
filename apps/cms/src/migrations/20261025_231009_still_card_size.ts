import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stills" ADD COLUMN "sizes_card_url" varchar;
  ALTER TABLE "stills" ADD COLUMN "sizes_card_width" numeric;
  ALTER TABLE "stills" ADD COLUMN "sizes_card_height" numeric;
  ALTER TABLE "stills" ADD COLUMN "sizes_card_mime_type" varchar;
  ALTER TABLE "stills" ADD COLUMN "sizes_card_filesize" numeric;
  ALTER TABLE "stills" ADD COLUMN "sizes_card_filename" varchar;
  CREATE INDEX "stills_sizes_card_sizes_card_filename_idx" ON "stills" USING btree ("sizes_card_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "stills_sizes_card_sizes_card_filename_idx";
  ALTER TABLE "stills" DROP COLUMN "sizes_card_url";
  ALTER TABLE "stills" DROP COLUMN "sizes_card_width";
  ALTER TABLE "stills" DROP COLUMN "sizes_card_height";
  ALTER TABLE "stills" DROP COLUMN "sizes_card_mime_type";
  ALTER TABLE "stills" DROP COLUMN "sizes_card_filesize";
  ALTER TABLE "stills" DROP COLUMN "sizes_card_filename";`)
}
