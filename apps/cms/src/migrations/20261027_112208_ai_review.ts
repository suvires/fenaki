import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_shorts_ai_review_credits_role" AS ENUM('director', 'writer', 'producer', 'cinematographer', 'editor', 'composer', 'cast');
  CREATE TYPE "public"."enum_shorts_ai_review_status" AS ENUM('analyzed', 'batched', 'refused', 'failed');
  CREATE TYPE "public"."enum_shorts_ai_review_recommendation" AS ENUM('publish', 'discard', 'needs-human');
  CREATE TYPE "public"."enum_shorts_ai_review_not_complete_reason" AS ENUM('trailer', 'making-of', 'episode', 'ad', 'gala', 'clip', 'interview', 'compilation', 'other');
  CREATE TYPE "public"."enum_shorts_ai_review_spoken_language" AS ENUM('es', 'none', 'other');
  CREATE TYPE "public"."enum_shorts_ai_review_spanish_subtitles" AS ENUM('yes', 'no', 'unknown');
  CREATE TYPE "public"."enum_shorts_ai_review_genre" AS ENUM('fiction', 'documentary', 'animation', 'experimental');
  CREATE TYPE "public"."enum_shorts_ai_review_technique" AS ENUM('animation', 'live-action', 'mixed', 'unknown');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'reviewShort';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'reviewBacklog';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'reviewShort';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'reviewBacklog';
  CREATE TABLE "shorts_ai_review_credits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_shorts_ai_review_credits_role"
  );
  
  ALTER TABLE "shorts" ADD COLUMN "ai_review_status" "enum_shorts_ai_review_status";
  ALTER TABLE "shorts" ADD COLUMN "ai_review_recommendation" "enum_shorts_ai_review_recommendation";
  ALTER TABLE "shorts" ADD COLUMN "ai_review_analyzed_at" timestamp(3) with time zone;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_reason" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_is_complete_short" boolean;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_not_complete_reason" "enum_shorts_ai_review_not_complete_reason";
  ALTER TABLE "shorts" ADD COLUMN "ai_review_spoken_language" "enum_shorts_ai_review_spoken_language";
  ALTER TABLE "shorts" ADD COLUMN "ai_review_spoken_language_other" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_spanish_subtitles" "enum_shorts_ai_review_spanish_subtitles";
  ALTER TABLE "shorts" ADD COLUMN "ai_review_title" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_year" numeric;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_country" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_genre" "enum_shorts_ai_review_genre";
  ALTER TABLE "shorts" ADD COLUMN "ai_review_technique" "enum_shorts_ai_review_technique";
  ALTER TABLE "shorts" ADD COLUMN "ai_review_branded_content" boolean;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_brand" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_restrictions" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_reupload_signs" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_synopsis" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_model" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_applied_at" timestamp(3) with time zone;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_batch_id" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_error" varchar;
  ALTER TABLE "shorts_ai_review_credits" ADD CONSTRAINT "shorts_ai_review_credits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shorts_ai_review_credits_order_idx" ON "shorts_ai_review_credits" USING btree ("_order");
  CREATE INDEX "shorts_ai_review_credits_parent_id_idx" ON "shorts_ai_review_credits" USING btree ("_parent_id");
  CREATE INDEX "shorts_ai_review_ai_review_status_idx" ON "shorts" USING btree ("ai_review_status");
  CREATE INDEX "shorts_ai_review_ai_review_recommendation_idx" ON "shorts" USING btree ("ai_review_recommendation");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "shorts_ai_review_credits" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "shorts_ai_review_credits" CASCADE;
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds', 'computeRanking', 'syncInbox', 'scanChannels');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds', 'computeRanking', 'syncInbox', 'scanChannels');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "shorts_ai_review_ai_review_status_idx";
  DROP INDEX "shorts_ai_review_ai_review_recommendation_idx";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_status";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_recommendation";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_analyzed_at";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_reason";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_is_complete_short";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_not_complete_reason";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_spoken_language";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_spoken_language_other";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_spanish_subtitles";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_title";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_year";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_country";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_genre";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_technique";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_branded_content";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_brand";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_restrictions";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_reupload_signs";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_synopsis";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_model";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_applied_at";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_batch_id";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_error";
  DROP TYPE "public"."enum_shorts_ai_review_credits_role";
  DROP TYPE "public"."enum_shorts_ai_review_status";
  DROP TYPE "public"."enum_shorts_ai_review_recommendation";
  DROP TYPE "public"."enum_shorts_ai_review_not_complete_reason";
  DROP TYPE "public"."enum_shorts_ai_review_spoken_language";
  DROP TYPE "public"."enum_shorts_ai_review_spanish_subtitles";
  DROP TYPE "public"."enum_shorts_ai_review_genre";
  DROP TYPE "public"."enum_shorts_ai_review_technique";`)
}
