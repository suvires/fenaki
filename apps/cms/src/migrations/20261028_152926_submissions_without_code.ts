import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * «Sube tu corto» without the verification code: a submission goes straight to review. Any still
 * waiting for a code (none had a short yet) are dropped.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "submissions" ALTER COLUMN "status" SET DATA TYPE text;
  DELETE FROM "submissions" WHERE "status" = 'awaiting-code';
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'in-review'::text;
  DROP TYPE "public"."enum_submissions_status";
  CREATE TYPE "public"."enum_submissions_status" AS ENUM('in-review', 'approved', 'rejected');
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'in-review'::"public"."enum_submissions_status";
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DATA TYPE "public"."enum_submissions_status" USING "status"::"public"."enum_submissions_status";
  ALTER TABLE "submissions" DROP COLUMN "note";
  ALTER TABLE "submissions" DROP COLUMN "code";
  ALTER TABLE "submissions" DROP COLUMN "verified_at";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_submissions_status" ADD VALUE 'awaiting-code' BEFORE 'in-review';
  ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'awaiting-code';
  ALTER TABLE "submissions" ADD COLUMN "note" varchar;
  ALTER TABLE "submissions" ADD COLUMN "code" varchar NOT NULL;
  ALTER TABLE "submissions" ADD COLUMN "verified_at" timestamp(3) with time zone;`)
}
