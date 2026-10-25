import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_stills_origin" AS ENUM('provider', 'author');
  CREATE TABLE "stills" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"short_id" integer NOT NULL,
  	"origin" "enum_stills_origin" DEFAULT 'author' NOT NULL,
  	"source_id" integer,
  	"fetched_at" timestamp(3) with time zone,
  	"permission_note" varchar,
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
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  ALTER TABLE "shorts" ADD COLUMN "still_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stills_id" integer;
  ALTER TABLE "stills" ADD CONSTRAINT "stills_short_id_shorts_id_fk" FOREIGN KEY ("short_id") REFERENCES "public"."shorts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stills" ADD CONSTRAINT "stills_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "stills_short_idx" ON "stills" USING btree ("short_id");
  CREATE INDEX "stills_source_idx" ON "stills" USING btree ("source_id");
  CREATE INDEX "stills_updated_at_idx" ON "stills" USING btree ("updated_at");
  CREATE INDEX "stills_created_at_idx" ON "stills" USING btree ("created_at");
  CREATE UNIQUE INDEX "stills_filename_idx" ON "stills" USING btree ("filename");
  CREATE INDEX "stills_sizes_hero_sizes_hero_filename_idx" ON "stills" USING btree ("sizes_hero_filename");
  ALTER TABLE "shorts" ADD CONSTRAINT "shorts_still_id_stills_id_fk" FOREIGN KEY ("still_id") REFERENCES "public"."stills"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stills_fk" FOREIGN KEY ("stills_id") REFERENCES "public"."stills"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shorts_still_idx" ON "shorts" USING btree ("still_id");
  CREATE INDEX "payload_locked_documents_rels_stills_id_idx" ON "payload_locked_documents_rels" USING btree ("stills_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stills" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "stills" CASCADE;
  ALTER TABLE "shorts" DROP CONSTRAINT "shorts_still_id_stills_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stills_fk";
  
  DROP INDEX "shorts_still_idx";
  DROP INDEX "payload_locked_documents_rels_stills_id_idx";
  ALTER TABLE "shorts" DROP COLUMN "still_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stills_id";
  DROP TYPE "public"."enum_stills_origin";`)
}
