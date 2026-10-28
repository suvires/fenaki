import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * pgvector and the embeddings of «Si te ha gustado» (src/related/embeddings.ts): one row per
 * short, gone with it. Needs the PostgreSQL image with pgvector (infra/postgres).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'embedShorts';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'embedShorts';
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE TABLE "short_embeddings" (
  	"short_id" integer PRIMARY KEY NOT NULL REFERENCES "shorts"("id") ON DELETE CASCADE,
  	"model" varchar NOT NULL,
  	"content_hash" varchar NOT NULL,
  	"embedding" vector(1024) NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE INDEX "short_embeddings_embedding_idx" ON "short_embeddings" USING hnsw ("embedding" vector_cosine_ops);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "short_embeddings";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds', 'computeRanking', 'syncInbox', 'scanChannels', 'reviewShort', 'reviewBacklog', 'regenerateSlugs');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds', 'computeRanking', 'syncInbox', 'scanChannels', 'reviewShort', 'reviewBacklog', 'regenerateSlugs');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";`)
}
