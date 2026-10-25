import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'computeRanking' BEFORE 'syncInbox';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'computeRanking' BEFORE 'syncInbox';
  CREATE TABLE "ranking" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"computed_at" timestamp(3) with time zone,
  	"window_start" timestamp(3) with time zone,
  	"window_end" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "ranking_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"shorts_id" integer
  );
  
  ALTER TABLE "ranking_rels" ADD CONSTRAINT "ranking_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ranking"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ranking_rels" ADD CONSTRAINT "ranking_rels_shorts_fk" FOREIGN KEY ("shorts_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ranking_rels_order_idx" ON "ranking_rels" USING btree ("order");
  CREATE INDEX "ranking_rels_parent_idx" ON "ranking_rels" USING btree ("parent_id");
  CREATE INDEX "ranking_rels_path_idx" ON "ranking_rels" USING btree ("path");
  CREATE INDEX "ranking_rels_shorts_id_idx" ON "ranking_rels" USING btree ("shorts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ranking" CASCADE;
  DROP TABLE "ranking_rels" CASCADE;
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds', 'syncInbox');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds', 'syncInbox');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";`)
}
