import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_showcases_kind" AS ENUM('festival', 'school', 'institution');
  CREATE TYPE "public"."enum_showcases_status" AS ENUM('draft', 'published');
  CREATE TABLE "showcases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"kind" "enum_showcases_kind" NOT NULL,
  	"website" varchar,
  	"logo_id" integer,
  	"off_circuit_confirmed" boolean DEFAULT false,
  	"presented_by_id" integer,
  	"status" "enum_showcases_status" DEFAULT 'draft' NOT NULL,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "showcases_locales" (
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "showcases_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"shorts_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
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
  	"focal_y" numeric,
  	"sizes_logo_url" varchar,
  	"sizes_logo_width" numeric,
  	"sizes_logo_height" numeric,
  	"sizes_logo_mime_type" varchar,
  	"sizes_logo_filesize" numeric,
  	"sizes_logo_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "showcases_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "showcases" ADD CONSTRAINT "showcases_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "showcases" ADD CONSTRAINT "showcases_presented_by_id_sponsors_id_fk" FOREIGN KEY ("presented_by_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "showcases_locales" ADD CONSTRAINT "showcases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."showcases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "showcases_rels" ADD CONSTRAINT "showcases_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."showcases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "showcases_rels" ADD CONSTRAINT "showcases_rels_shorts_fk" FOREIGN KEY ("shorts_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "showcases_slug_idx" ON "showcases" USING btree ("slug");
  CREATE INDEX "showcases_logo_idx" ON "showcases" USING btree ("logo_id");
  CREATE INDEX "showcases_presented_by_idx" ON "showcases" USING btree ("presented_by_id");
  CREATE INDEX "showcases_status_idx" ON "showcases" USING btree ("status");
  CREATE INDEX "showcases_updated_at_idx" ON "showcases" USING btree ("updated_at");
  CREATE INDEX "showcases_created_at_idx" ON "showcases" USING btree ("created_at");
  CREATE UNIQUE INDEX "showcases_locales_locale_parent_id_unique" ON "showcases_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "showcases_locales_parent_id_idx" ON "showcases_locales" USING btree ("_parent_id");
  CREATE INDEX "showcases_rels_order_idx" ON "showcases_rels" USING btree ("order");
  CREATE INDEX "showcases_rels_parent_idx" ON "showcases_rels" USING btree ("parent_id");
  CREATE INDEX "showcases_rels_path_idx" ON "showcases_rels" USING btree ("path");
  CREATE INDEX "showcases_rels_shorts_id_idx" ON "showcases_rels" USING btree ("shorts_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_logo_sizes_logo_filename_idx" ON "media" USING btree ("sizes_logo_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "media_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_showcases_fk" FOREIGN KEY ("showcases_id") REFERENCES "public"."showcases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_showcases_id_idx" ON "payload_locked_documents_rels" USING btree ("showcases_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "showcases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "showcases_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "showcases_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "showcases" CASCADE;
  DROP TABLE "showcases_locales" CASCADE;
  DROP TABLE "showcases_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_showcases_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";
  
  DROP INDEX "payload_locked_documents_rels_showcases_id_idx";
  DROP INDEX "payload_locked_documents_rels_media_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "showcases_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_id";
  DROP TYPE "public"."enum_showcases_kind";
  DROP TYPE "public"."enum_showcases_status";`)
}
