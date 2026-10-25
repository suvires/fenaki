import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_shorts_hidden_reason" AS ENUM('broken', 'private', 'not-embeddable', 'age-restricted');
  CREATE TYPE "public"."enum_sources_channel_kind" AS ENUM('author', 'producer', 'distributor', 'festival', 'school', 'institution');
  ALTER TYPE "public"."enum_shorts_status" ADD VALUE 'review' BEFORE 'published';
  ALTER TABLE "shorts" ALTER COLUMN "duration_seconds" DROP NOT NULL;
  ALTER TABLE "shorts" ALTER COLUMN "type" DROP NOT NULL;
  ALTER TABLE "shorts" ADD COLUMN "hidden_reason" "enum_shorts_hidden_reason";
  ALTER TABLE "shorts" ADD COLUMN "hidden_at" timestamp(3) with time zone;
  ALTER TABLE "shorts" ADD COLUMN "tmdb_id" numeric;
  ALTER TABLE "sources" ADD COLUMN "channel_name" varchar;
  ALTER TABLE "sources" ADD COLUMN "channel_kind" "enum_sources_channel_kind";
  ALTER TABLE "sources" ADD COLUMN "channel_url" varchar;
  ALTER TABLE "sources" ADD COLUMN "channel_external_id" varchar;
  ALTER TABLE "sources" ADD COLUMN "official_evidence" varchar;
  ALTER TABLE "sources" ADD COLUMN "age_restricted" boolean DEFAULT false;
  ALTER TABLE "sources" ADD COLUMN "problem_since" timestamp(3) with time zone;
  ALTER TABLE "sources" ADD COLUMN "check_note" varchar;
  ALTER TABLE "sources" ADD COLUMN "thumbnail_url" varchar;
  ALTER TABLE "sources" ADD COLUMN "uploaded_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "shorts" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "shorts" ALTER COLUMN "status" SET DEFAULT 'draft'::text;
  DROP TYPE "public"."enum_shorts_status";
  CREATE TYPE "public"."enum_shorts_status" AS ENUM('draft', 'published', 'withdrawn');
  ALTER TABLE "shorts" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."enum_shorts_status";
  ALTER TABLE "shorts" ALTER COLUMN "status" SET DATA TYPE "public"."enum_shorts_status" USING "status"::"public"."enum_shorts_status";
  ALTER TABLE "shorts" ALTER COLUMN "duration_seconds" SET NOT NULL;
  ALTER TABLE "shorts" ALTER COLUMN "type" SET NOT NULL;
  ALTER TABLE "shorts" DROP COLUMN "hidden_reason";
  ALTER TABLE "shorts" DROP COLUMN "hidden_at";
  ALTER TABLE "shorts" DROP COLUMN "tmdb_id";
  ALTER TABLE "sources" DROP COLUMN "channel_name";
  ALTER TABLE "sources" DROP COLUMN "channel_kind";
  ALTER TABLE "sources" DROP COLUMN "channel_url";
  ALTER TABLE "sources" DROP COLUMN "channel_external_id";
  ALTER TABLE "sources" DROP COLUMN "official_evidence";
  ALTER TABLE "sources" DROP COLUMN "age_restricted";
  ALTER TABLE "sources" DROP COLUMN "problem_since";
  ALTER TABLE "sources" DROP COLUMN "check_note";
  ALTER TABLE "sources" DROP COLUMN "thumbnail_url";
  ALTER TABLE "sources" DROP COLUMN "uploaded_at";
  DROP TYPE "public"."enum_shorts_hidden_reason";
  DROP TYPE "public"."enum_sources_channel_kind";`)
}
