import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_organizations_works_request" AS ENUM('permission', 'confirm_channel', 'official_upload');
  CREATE TYPE "public"."enum_organizations_reason" AS ENUM('sales', 'rights');
  ALTER TYPE "public"."enum_organizations_type" ADD VALUE 'producer' BEFORE 'institution';
  ALTER TYPE "public"."enum_organizations_type" ADD VALUE 'author' BEFORE 'institution';
  ALTER TYPE "public"."enum_organizations_type" ADD VALUE 'media' BEFORE 'institution';
  CREATE TABLE "organizations_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"request" "enum_organizations_works_request",
  	"why" varchar
  );
  
  ALTER TABLE "organizations" ADD COLUMN "reason" "enum_organizations_reason" DEFAULT 'sales' NOT NULL;
  ALTER TABLE "organizations_works" ADD CONSTRAINT "organizations_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "organizations_works_order_idx" ON "organizations_works" USING btree ("_order");
  CREATE INDEX "organizations_works_parent_id_idx" ON "organizations_works" USING btree ("_parent_id");
  CREATE INDEX "organizations_reason_idx" ON "organizations" USING btree ("reason");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organizations_works" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "organizations_works" CASCADE;
  ALTER TABLE "organizations" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "organizations" ALTER COLUMN "type" SET DEFAULT 'other'::text;
  DROP TYPE "public"."enum_organizations_type";
  CREATE TYPE "public"."enum_organizations_type" AS ENUM('festival', 'school', 'brand', 'distributor', 'institution', 'other');
  ALTER TABLE "organizations" ALTER COLUMN "type" SET DEFAULT 'other'::"public"."enum_organizations_type";
  ALTER TABLE "organizations" ALTER COLUMN "type" SET DATA TYPE "public"."enum_organizations_type" USING "type"::"public"."enum_organizations_type";
  DROP INDEX "organizations_reason_idx";
  ALTER TABLE "organizations" DROP COLUMN "reason";
  DROP TYPE "public"."enum_organizations_works_request";
  DROP TYPE "public"."enum_organizations_reason";`)
}
