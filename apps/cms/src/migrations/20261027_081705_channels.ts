import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_channels_provider" AS ENUM('youtube', 'vimeo');
  CREATE TYPE "public"."enum_channels_kind" AS ENUM('author', 'producer', 'distributor', 'festival', 'school', 'institution');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'scanChannels';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'scanChannels';
  CREATE TABLE "channels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL,
  	"name" varchar,
  	"provider" "enum_channels_provider" DEFAULT 'youtube' NOT NULL,
  	"external_id" varchar,
  	"kind" "enum_channels_kind" NOT NULL,
  	"organization_id" integer,
  	"official_evidence" varchar,
  	"active" boolean DEFAULT true,
  	"min_duration_seconds" numeric DEFAULT 120 NOT NULL,
  	"max_duration_seconds" numeric DEFAULT 2700 NOT NULL,
  	"default_language" varchar,
  	"last_scanned_at" timestamp(3) with time zone,
  	"last_scan_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "shorts" ADD COLUMN "ingest_channel_id" integer;
  ALTER TABLE "sources" ADD COLUMN "ingest_channel_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "channels_id" integer;
  ALTER TABLE "channels" ADD CONSTRAINT "channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "channels_external_id_idx" ON "channels" USING btree ("external_id");
  CREATE INDEX "channels_organization_idx" ON "channels" USING btree ("organization_id");
  CREATE INDEX "channels_active_idx" ON "channels" USING btree ("active");
  CREATE INDEX "channels_updated_at_idx" ON "channels" USING btree ("updated_at");
  CREATE INDEX "channels_created_at_idx" ON "channels" USING btree ("created_at");
  ALTER TABLE "shorts" ADD CONSTRAINT "shorts_ingest_channel_id_channels_id_fk" FOREIGN KEY ("ingest_channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources" ADD CONSTRAINT "sources_ingest_channel_id_channels_id_fk" FOREIGN KEY ("ingest_channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_channels_fk" FOREIGN KEY ("channels_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shorts_ingest_channel_idx" ON "shorts" USING btree ("ingest_channel_id");
  CREATE INDEX "sources_ingest_channel_idx" ON "sources" USING btree ("ingest_channel_id");
  CREATE INDEX "payload_locked_documents_rels_channels_id_idx" ON "payload_locked_documents_rels" USING btree ("channels_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "channels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "channels" CASCADE;
  ALTER TABLE "shorts" DROP CONSTRAINT "shorts_ingest_channel_id_channels_id_fk";
  
  ALTER TABLE "sources" DROP CONSTRAINT "sources_ingest_channel_id_channels_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_channels_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds', 'computeRanking', 'syncInbox');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds', 'computeRanking', 'syncInbox');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "shorts_ingest_channel_idx";
  DROP INDEX "sources_ingest_channel_idx";
  DROP INDEX "payload_locked_documents_rels_channels_id_idx";
  ALTER TABLE "shorts" DROP COLUMN "ingest_channel_id";
  ALTER TABLE "sources" DROP COLUMN "ingest_channel_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "channels_id";
  DROP TYPE "public"."enum_channels_provider";
  DROP TYPE "public"."enum_channels_kind";`)
}
