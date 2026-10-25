import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('es');
  CREATE TYPE "public"."enum_shorts_credits_role" AS ENUM('director', 'writer', 'producer', 'cinematographer', 'editor', 'composer', 'cast');
  CREATE TYPE "public"."enum_shorts_type" AS ENUM('fiction', 'documentary', 'animation', 'experimental');
  CREATE TYPE "public"."enum_shorts_poster_tone" AS ENUM('sala', 'tungsteno', 'plata');
  CREATE TYPE "public"."enum_shorts_status" AS ENUM('draft', 'published', 'withdrawn');
  CREATE TYPE "public"."enum_sources_provider" AS ENUM('youtube', 'vimeo', 'bunny');
  CREATE TYPE "public"."enum_sources_status" AS ENUM('unchecked', 'ok', 'broken', 'private');
  CREATE TYPE "public"."enum_collections_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_licenses_route" AS ENUM('embed', 'open', 'direct');
  CREATE TYPE "public"."enum_licenses_type" AS ENUM('platform-terms', 'cc-by', 'cc-by-sa', 'cc-by-nd', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd', 'cc0', 'public-domain', 'direct-agreement');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'indexShort');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'indexShort');
  CREATE TABLE "shorts_credits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"person_id" integer NOT NULL,
  	"role" "enum_shorts_credits_role" DEFAULT 'director' NOT NULL
  );
  
  CREATE TABLE "shorts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"duration_seconds" numeric NOT NULL,
  	"year" numeric,
  	"country" varchar,
  	"original_language" varchar,
  	"type" "enum_shorts_type" NOT NULL,
  	"no_dialogue" boolean DEFAULT false,
  	"poster_tone" "enum_shorts_poster_tone" DEFAULT 'sala',
  	"branded_content" boolean DEFAULT false,
  	"brand" varchar,
  	"status" "enum_shorts_status" DEFAULT 'draft' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"sample" boolean DEFAULT false,
  	"import_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shorts_locales" (
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"synopsis" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"short_id" integer NOT NULL,
  	"provider" "enum_sources_provider" NOT NULL,
  	"external_id" varchar NOT NULL,
  	"url" varchar,
  	"embeddable" boolean DEFAULT true,
  	"status" "enum_sources_status" DEFAULT 'unchecked' NOT NULL,
  	"last_checked_at" timestamp(3) with time zone,
  	"license_id" integer NOT NULL,
  	"import_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sources_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "people" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"import_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "people_locales" (
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"featured" boolean DEFAULT false,
  	"status" "enum_collections_status" DEFAULT 'draft' NOT NULL,
  	"sponsor_id" integer,
  	"sponsorship_starts_at" timestamp(3) with time zone,
  	"sponsorship_ends_at" timestamp(3) with time zone,
  	"sample" boolean DEFAULT false,
  	"import_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "collections_locales" (
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "collections_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"shorts_id" integer
  );
  
  CREATE TABLE "licenses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"route" "enum_licenses_route" NOT NULL,
  	"type" "enum_licenses_type" NOT NULL,
  	"attribution" varchar,
  	"signed_document_id" integer,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"import_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "license_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "sponsors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"website" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"shorts_id" integer,
  	"sources_id" integer,
  	"people_id" integer,
  	"collections_id" integer,
  	"licenses_id" integer,
  	"license_documents_id" integer,
  	"sponsors_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "shorts_credits" ADD CONSTRAINT "shorts_credits_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shorts_credits" ADD CONSTRAINT "shorts_credits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shorts_locales" ADD CONSTRAINT "shorts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sources" ADD CONSTRAINT "sources_short_id_shorts_id_fk" FOREIGN KEY ("short_id") REFERENCES "public"."shorts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources" ADD CONSTRAINT "sources_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sources_texts" ADD CONSTRAINT "sources_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "people_locales" ADD CONSTRAINT "people_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections" ADD CONSTRAINT "collections_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "collections_locales" ADD CONSTRAINT "collections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_rels" ADD CONSTRAINT "collections_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_rels" ADD CONSTRAINT "collections_rels_shorts_fk" FOREIGN KEY ("shorts_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "licenses" ADD CONSTRAINT "licenses_signed_document_id_license_documents_id_fk" FOREIGN KEY ("signed_document_id") REFERENCES "public"."license_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shorts_fk" FOREIGN KEY ("shorts_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_collections_fk" FOREIGN KEY ("collections_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_licenses_fk" FOREIGN KEY ("licenses_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_license_documents_fk" FOREIGN KEY ("license_documents_id") REFERENCES "public"."license_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sponsors_fk" FOREIGN KEY ("sponsors_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shorts_credits_order_idx" ON "shorts_credits" USING btree ("_order");
  CREATE INDEX "shorts_credits_parent_id_idx" ON "shorts_credits" USING btree ("_parent_id");
  CREATE INDEX "shorts_credits_person_idx" ON "shorts_credits" USING btree ("person_id");
  CREATE INDEX "shorts_branded_content_idx" ON "shorts" USING btree ("branded_content");
  CREATE INDEX "shorts_status_idx" ON "shorts" USING btree ("status");
  CREATE INDEX "shorts_published_at_idx" ON "shorts" USING btree ("published_at");
  CREATE INDEX "shorts_sample_idx" ON "shorts" USING btree ("sample");
  CREATE UNIQUE INDEX "shorts_import_key_idx" ON "shorts" USING btree ("import_key");
  CREATE INDEX "shorts_updated_at_idx" ON "shorts" USING btree ("updated_at");
  CREATE INDEX "shorts_created_at_idx" ON "shorts" USING btree ("created_at");
  CREATE UNIQUE INDEX "shorts_slug_idx" ON "shorts_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "shorts_locales_locale_parent_id_unique" ON "shorts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "shorts_locales_parent_id_idx" ON "shorts_locales" USING btree ("_parent_id");
  CREATE INDEX "sources_short_idx" ON "sources" USING btree ("short_id");
  CREATE INDEX "sources_external_id_idx" ON "sources" USING btree ("external_id");
  CREATE INDEX "sources_license_idx" ON "sources" USING btree ("license_id");
  CREATE UNIQUE INDEX "sources_import_key_idx" ON "sources" USING btree ("import_key");
  CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
  CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");
  CREATE INDEX "sources_texts_order_parent" ON "sources_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "people_slug_idx" ON "people" USING btree ("slug");
  CREATE UNIQUE INDEX "people_import_key_idx" ON "people" USING btree ("import_key");
  CREATE INDEX "people_updated_at_idx" ON "people" USING btree ("updated_at");
  CREATE INDEX "people_created_at_idx" ON "people" USING btree ("created_at");
  CREATE UNIQUE INDEX "people_locales_locale_parent_id_unique" ON "people_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "people_locales_parent_id_idx" ON "people_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_featured_idx" ON "collections" USING btree ("featured");
  CREATE INDEX "collections_status_idx" ON "collections" USING btree ("status");
  CREATE INDEX "collections_sponsor_idx" ON "collections" USING btree ("sponsor_id");
  CREATE UNIQUE INDEX "collections_import_key_idx" ON "collections" USING btree ("import_key");
  CREATE INDEX "collections_updated_at_idx" ON "collections" USING btree ("updated_at");
  CREATE INDEX "collections_created_at_idx" ON "collections" USING btree ("created_at");
  CREATE UNIQUE INDEX "collections_slug_idx" ON "collections_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "collections_locales_locale_parent_id_unique" ON "collections_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "collections_locales_parent_id_idx" ON "collections_locales" USING btree ("_parent_id");
  CREATE INDEX "collections_rels_order_idx" ON "collections_rels" USING btree ("order");
  CREATE INDEX "collections_rels_parent_idx" ON "collections_rels" USING btree ("parent_id");
  CREATE INDEX "collections_rels_path_idx" ON "collections_rels" USING btree ("path");
  CREATE INDEX "collections_rels_shorts_id_idx" ON "collections_rels" USING btree ("shorts_id");
  CREATE INDEX "licenses_signed_document_idx" ON "licenses" USING btree ("signed_document_id");
  CREATE UNIQUE INDEX "licenses_import_key_idx" ON "licenses" USING btree ("import_key");
  CREATE INDEX "licenses_updated_at_idx" ON "licenses" USING btree ("updated_at");
  CREATE INDEX "licenses_created_at_idx" ON "licenses" USING btree ("created_at");
  CREATE INDEX "license_documents_updated_at_idx" ON "license_documents" USING btree ("updated_at");
  CREATE INDEX "license_documents_created_at_idx" ON "license_documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "license_documents_filename_idx" ON "license_documents" USING btree ("filename");
  CREATE INDEX "sponsors_updated_at_idx" ON "sponsors" USING btree ("updated_at");
  CREATE INDEX "sponsors_created_at_idx" ON "sponsors" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_shorts_id_idx" ON "payload_locked_documents_rels" USING btree ("shorts_id");
  CREATE INDEX "payload_locked_documents_rels_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("sources_id");
  CREATE INDEX "payload_locked_documents_rels_people_id_idx" ON "payload_locked_documents_rels" USING btree ("people_id");
  CREATE INDEX "payload_locked_documents_rels_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("collections_id");
  CREATE INDEX "payload_locked_documents_rels_licenses_id_idx" ON "payload_locked_documents_rels" USING btree ("licenses_id");
  CREATE INDEX "payload_locked_documents_rels_license_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("license_documents_id");
  CREATE INDEX "payload_locked_documents_rels_sponsors_id_idx" ON "payload_locked_documents_rels" USING btree ("sponsors_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "shorts_credits" CASCADE;
  DROP TABLE "shorts" CASCADE;
  DROP TABLE "shorts_locales" CASCADE;
  DROP TABLE "sources" CASCADE;
  DROP TABLE "sources_texts" CASCADE;
  DROP TABLE "people" CASCADE;
  DROP TABLE "people_locales" CASCADE;
  DROP TABLE "collections" CASCADE;
  DROP TABLE "collections_locales" CASCADE;
  DROP TABLE "collections_rels" CASCADE;
  DROP TABLE "licenses" CASCADE;
  DROP TABLE "license_documents" CASCADE;
  DROP TABLE "sponsors" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_shorts_credits_role";
  DROP TYPE "public"."enum_shorts_type";
  DROP TYPE "public"."enum_shorts_poster_tone";
  DROP TYPE "public"."enum_shorts_status";
  DROP TYPE "public"."enum_sources_provider";
  DROP TYPE "public"."enum_sources_status";
  DROP TYPE "public"."enum_collections_status";
  DROP TYPE "public"."enum_licenses_route";
  DROP TYPE "public"."enum_licenses_type";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
