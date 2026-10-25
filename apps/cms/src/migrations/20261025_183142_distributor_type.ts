import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_organizations_type" ADD VALUE 'distributor' BEFORE 'institution';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organizations" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "organizations" ALTER COLUMN "type" SET DEFAULT 'other'::text;
  DROP TYPE "public"."enum_organizations_type";
  CREATE TYPE "public"."enum_organizations_type" AS ENUM('festival', 'school', 'brand', 'institution', 'other');
  ALTER TABLE "organizations" ALTER COLUMN "type" SET DEFAULT 'other'::"public"."enum_organizations_type";
  ALTER TABLE "organizations" ALTER COLUMN "type" SET DATA TYPE "public"."enum_organizations_type" USING "type"::"public"."enum_organizations_type";`)
}
