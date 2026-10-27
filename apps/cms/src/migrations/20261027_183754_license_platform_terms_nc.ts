import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_licenses_type" ADD VALUE 'platform-terms-nc' BEFORE 'cc-by';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "licenses" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE "public"."enum_licenses_type";
  CREATE TYPE "public"."enum_licenses_type" AS ENUM('platform-terms', 'cc-by', 'cc-by-sa', 'cc-by-nd', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd', 'cc0', 'public-domain', 'direct-agreement');
  ALTER TABLE "licenses" ALTER COLUMN "type" SET DATA TYPE "public"."enum_licenses_type" USING "type"::"public"."enum_licenses_type";`)
}
