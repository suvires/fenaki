import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_shorts_language_source" AS ENUM('provider', 'channel', 'ai', 'editor');
  CREATE TYPE "public"."enum_sources_captions" AS ENUM('yes', 'no');
  CREATE TYPE "public"."enum_sources_subtitles_source" AS ENUM('provider', 'ai', 'editor');
  CREATE TYPE "public"."enum_scanned_videos_provider" AS ENUM('youtube', 'vimeo');
  CREATE TYPE "public"."enum_scanned_videos_outcome" AS ENUM('added', 'skipped');
  CREATE TYPE "public"."enum_scanned_videos_skip_reason" AS ENUM('duplicate', 'private', 'not-embeddable', 'age-restricted', 'unavailable', 'unknown-duration', 'too-short', 'too-long', 'not-a-short', 'not-in-catalog-language', 'failed');
  CREATE TYPE "public"."enum_scanned_videos_captions" AS ENUM('yes', 'no');
  CREATE TYPE "public"."enum_scanned_videos_language_source" AS ENUM('provider', 'channel', 'ai', 'editor');
  CREATE TABLE "shorts_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "scanned_videos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"channel_id" integer,
  	"provider" "enum_scanned_videos_provider" NOT NULL,
  	"external_id" varchar NOT NULL,
  	"url" varchar,
  	"title" varchar,
  	"duration_seconds" numeric,
  	"published_at" timestamp(3) with time zone,
  	"outcome" "enum_scanned_videos_outcome" NOT NULL,
  	"skip_reason" "enum_scanned_videos_skip_reason",
  	"short_id" integer,
  	"note" varchar,
  	"captions" "enum_scanned_videos_captions",
  	"language_source" "enum_scanned_videos_language_source",
  	"first_seen_at" timestamp(3) with time zone,
  	"last_seen_at" timestamp(3) with time zone,
  	"reevaluate" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "scanned_videos_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "catalog_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "catalog_settings_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "shorts" ADD COLUMN "language_source" "enum_shorts_language_source";
  ALTER TABLE "sources" ADD COLUMN "captions" "enum_sources_captions";
  ALTER TABLE "sources" ADD COLUMN "subtitles_source" "enum_sources_subtitles_source";
  ALTER TABLE "sources" ADD COLUMN "provider_description" varchar;
  ALTER TABLE "channels" ADD COLUMN "backlog_complete" boolean DEFAULT false;
  ALTER TABLE "channels" ADD COLUMN "rescan_all" boolean DEFAULT false;
  ALTER TABLE "channels" ADD COLUMN "backlog_cursor" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "scanned_videos_id" integer;
  ALTER TABLE "shorts_texts" ADD CONSTRAINT "shorts_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scanned_videos" ADD CONSTRAINT "scanned_videos_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scanned_videos" ADD CONSTRAINT "scanned_videos_short_id_shorts_id_fk" FOREIGN KEY ("short_id") REFERENCES "public"."shorts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scanned_videos_texts" ADD CONSTRAINT "scanned_videos_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."scanned_videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "catalog_settings_texts" ADD CONSTRAINT "catalog_settings_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."catalog_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shorts_texts_order_parent" ON "shorts_texts" USING btree ("order","parent_id");
  CREATE INDEX "scanned_videos_channel_idx" ON "scanned_videos" USING btree ("channel_id");
  CREATE INDEX "scanned_videos_external_id_idx" ON "scanned_videos" USING btree ("external_id");
  CREATE INDEX "scanned_videos_outcome_idx" ON "scanned_videos" USING btree ("outcome");
  CREATE INDEX "scanned_videos_skip_reason_idx" ON "scanned_videos" USING btree ("skip_reason");
  CREATE INDEX "scanned_videos_short_idx" ON "scanned_videos" USING btree ("short_id");
  CREATE INDEX "scanned_videos_last_seen_at_idx" ON "scanned_videos" USING btree ("last_seen_at");
  CREATE INDEX "scanned_videos_reevaluate_idx" ON "scanned_videos" USING btree ("reevaluate");
  CREATE INDEX "scanned_videos_updated_at_idx" ON "scanned_videos" USING btree ("updated_at");
  CREATE INDEX "scanned_videos_created_at_idx" ON "scanned_videos" USING btree ("created_at");
  CREATE UNIQUE INDEX "provider_externalId_idx" ON "scanned_videos" USING btree ("provider","external_id");
  CREATE INDEX "scanned_videos_texts_order_parent" ON "scanned_videos_texts" USING btree ("order","parent_id");
  CREATE INDEX "catalog_settings_texts_order_parent" ON "catalog_settings_texts" USING btree ("order","parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scanned_videos_fk" FOREIGN KEY ("scanned_videos_id") REFERENCES "public"."scanned_videos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "channels_backlog_complete_idx" ON "channels" USING btree ("backlog_complete");
  CREATE INDEX "payload_locked_documents_rels_scanned_videos_id_idx" ON "payload_locked_documents_rels" USING btree ("scanned_videos_id");`)

  // Every video that is already a source of a short has been through the catalog: the ledger
  // starts out knowing it, so the first full scan of a channel does no work on it again.
  await db.execute(sql`
   INSERT INTO "scanned_videos" ("channel_id", "provider", "external_id", "url", "title", "duration_seconds", "published_at", "outcome", "short_id", "note", "first_seen_at", "last_seen_at", "reevaluate")
   SELECT DISTINCT ON (s."provider", s."external_id")
     s."ingest_channel_id",
     s."provider"::text::"enum_scanned_videos_provider",
     s."external_id",
     s."url",
     l."title",
     sh."duration_seconds",
     s."uploaded_at",
     'added',
     s."short_id",
     'In the catalog before the scanned videos ledger existed.',
     now(),
     now(),
     false
   FROM "sources" s
   JOIN "shorts" sh ON sh."id" = s."short_id"
   LEFT JOIN "shorts_locales" l ON l."_parent_id" = sh."id" AND l."_locale" = 'es'
   WHERE s."provider" IN ('youtube', 'vimeo')
   ORDER BY s."provider", s."external_id", s."id"
   ON CONFLICT DO NOTHING;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "shorts_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scanned_videos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "scanned_videos_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalog_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalog_settings_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "shorts_texts" CASCADE;
  DROP TABLE "scanned_videos" CASCADE;
  DROP TABLE "scanned_videos_texts" CASCADE;
  DROP TABLE "catalog_settings" CASCADE;
  DROP TABLE "catalog_settings_texts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_scanned_videos_fk";
  
  DROP INDEX "channels_backlog_complete_idx";
  DROP INDEX "payload_locked_documents_rels_scanned_videos_id_idx";
  ALTER TABLE "shorts" DROP COLUMN "language_source";
  ALTER TABLE "sources" DROP COLUMN "captions";
  ALTER TABLE "sources" DROP COLUMN "subtitles_source";
  ALTER TABLE "sources" DROP COLUMN "provider_description";
  ALTER TABLE "channels" DROP COLUMN "backlog_complete";
  ALTER TABLE "channels" DROP COLUMN "rescan_all";
  ALTER TABLE "channels" DROP COLUMN "backlog_cursor";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "scanned_videos_id";
  DROP TYPE "public"."enum_shorts_language_source";
  DROP TYPE "public"."enum_sources_captions";
  DROP TYPE "public"."enum_sources_subtitles_source";
  DROP TYPE "public"."enum_scanned_videos_provider";
  DROP TYPE "public"."enum_scanned_videos_outcome";
  DROP TYPE "public"."enum_scanned_videos_skip_reason";
  DROP TYPE "public"."enum_scanned_videos_captions";
  DROP TYPE "public"."enum_scanned_videos_language_source";`)
}
