import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_stills_text_color" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum_stills_text_color_auto" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum_stills_text_color_set" AS ENUM('auto', 'manual');
  ALTER TABLE "stills" ADD COLUMN "text_color" "enum_stills_text_color" DEFAULT 'light';
  ALTER TABLE "stills" ADD COLUMN "includes_title" boolean DEFAULT false;
  ALTER TABLE "stills" ADD COLUMN "text_color_auto" "enum_stills_text_color_auto";
  ALTER TABLE "stills" ADD COLUMN "text_color_set" "enum_stills_text_color_set" DEFAULT 'auto';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stills" DROP COLUMN "text_color";
  ALTER TABLE "stills" DROP COLUMN "includes_title";
  ALTER TABLE "stills" DROP COLUMN "text_color_auto";
  ALTER TABLE "stills" DROP COLUMN "text_color_set";
  DROP TYPE "public"."enum_stills_text_color";
  DROP TYPE "public"."enum_stills_text_color_auto";
  DROP TYPE "public"."enum_stills_text_color_set";`)
}
