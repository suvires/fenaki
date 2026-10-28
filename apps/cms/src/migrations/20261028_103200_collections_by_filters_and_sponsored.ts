import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_collections_rules_types" AS ENUM('fiction', 'documentary', 'animation', 'experimental');
  CREATE TYPE "public"."enum_collections_rules_genres" AS ENUM('drama', 'comedy', 'horror', 'thriller', 'science-fiction', 'fantasy', 'romance', 'action-adventure', 'musical-dance');
  CREATE TYPE "public"."enum_collections_rules_themes" AS ENUM('society', 'lgbtiq', 'family', 'memory-history', 'nature-environment', 'sport');
  CREATE TYPE "public"."enum_collections_rules_channel_kinds" AS ENUM('author', 'producer', 'distributor', 'festival', 'school', 'institution');
  CREATE TYPE "public"."enum_collections_mode" AS ENUM('rules', 'manual');
  CREATE TYPE "public"."enum_collections_rules_region" AS ENUM('latin-america', 'spain', 'europe');
  CREATE TYPE "public"."enum_collections_sort" AS ENUM('newest', 'year', 'daily');
  CREATE TYPE "public"."enum_sponsored_collections_status" AS ENUM('draft', 'published');
  CREATE TABLE "collections_rules_types" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_collections_rules_types",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "collections_rules_genres" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_collections_rules_genres",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "collections_rules_themes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_collections_rules_themes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "collections_rules_channel_kinds" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_collections_rules_channel_kinds",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "collections_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "sponsored_collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sponsor_id" integer NOT NULL,
  	"sponsorship_starts_at" timestamp(3) with time zone,
  	"sponsorship_ends_at" timestamp(3) with time zone,
  	"featured" boolean DEFAULT false,
  	"status" "enum_sponsored_collections_status" DEFAULT 'draft' NOT NULL,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sponsored_collections_locales" (
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sponsored_collections_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"shorts_id" integer
  );
  
  
  ALTER TABLE "collections" ADD COLUMN "mode" "enum_collections_mode" DEFAULT 'rules' NOT NULL;
  ALTER TABLE "collections" ADD COLUMN "rules_region" "enum_collections_rules_region";
  ALTER TABLE "collections" ADD COLUMN "rules_min_minutes" numeric;
  ALTER TABLE "collections" ADD COLUMN "rules_max_minutes" numeric;
  ALTER TABLE "collections" ADD COLUMN "rules_year_from" numeric;
  ALTER TABLE "collections" ADD COLUMN "rules_year_to" numeric;
  ALTER TABLE "collections" ADD COLUMN "rules_original_language" varchar;
  ALTER TABLE "collections" ADD COLUMN "rules_spanish_subtitles" boolean;
  ALTER TABLE "collections" ADD COLUMN "rules_no_dialogue" boolean;
  ALTER TABLE "collections" ADD COLUMN "rules_all_audiences" boolean;
  ALTER TABLE "collections" ADD COLUMN "rules_with_awards" boolean;
  ALTER TABLE "collections" ADD COLUMN "sort" "enum_collections_sort" DEFAULT 'newest' NOT NULL;
  ALTER TABLE "collections" ADD COLUMN "rail_size" numeric DEFAULT 12 NOT NULL;
  ALTER TABLE "sponsors" ADD COLUMN "logo_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sponsored_collections_id" integer;
  ALTER TABLE "collections_rules_types" ADD CONSTRAINT "collections_rules_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_rules_genres" ADD CONSTRAINT "collections_rules_genres_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_rules_themes" ADD CONSTRAINT "collections_rules_themes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_rules_channel_kinds" ADD CONSTRAINT "collections_rules_channel_kinds_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "collections_texts" ADD CONSTRAINT "collections_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sponsored_collections" ADD CONSTRAINT "sponsored_collections_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sponsored_collections_locales" ADD CONSTRAINT "sponsored_collections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sponsored_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sponsored_collections_rels" ADD CONSTRAINT "sponsored_collections_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sponsored_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sponsored_collections_rels" ADD CONSTRAINT "sponsored_collections_rels_shorts_fk" FOREIGN KEY ("shorts_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "collections_rules_types_order_idx" ON "collections_rules_types" USING btree ("order");
  CREATE INDEX "collections_rules_types_parent_idx" ON "collections_rules_types" USING btree ("parent_id");
  CREATE INDEX "collections_rules_genres_order_idx" ON "collections_rules_genres" USING btree ("order");
  CREATE INDEX "collections_rules_genres_parent_idx" ON "collections_rules_genres" USING btree ("parent_id");
  CREATE INDEX "collections_rules_themes_order_idx" ON "collections_rules_themes" USING btree ("order");
  CREATE INDEX "collections_rules_themes_parent_idx" ON "collections_rules_themes" USING btree ("parent_id");
  CREATE INDEX "collections_rules_channel_kinds_order_idx" ON "collections_rules_channel_kinds" USING btree ("order");
  CREATE INDEX "collections_rules_channel_kinds_parent_idx" ON "collections_rules_channel_kinds" USING btree ("parent_id");
  CREATE INDEX "collections_texts_order_parent" ON "collections_texts" USING btree ("order","parent_id");
  CREATE INDEX "sponsored_collections_sponsor_idx" ON "sponsored_collections" USING btree ("sponsor_id");
  CREATE INDEX "sponsored_collections_featured_idx" ON "sponsored_collections" USING btree ("featured");
  CREATE INDEX "sponsored_collections_status_idx" ON "sponsored_collections" USING btree ("status");
  CREATE INDEX "sponsored_collections_updated_at_idx" ON "sponsored_collections" USING btree ("updated_at");
  CREATE INDEX "sponsored_collections_created_at_idx" ON "sponsored_collections" USING btree ("created_at");
  CREATE UNIQUE INDEX "sponsored_collections_slug_idx" ON "sponsored_collections_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "sponsored_collections_locales_locale_parent_id_unique" ON "sponsored_collections_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "sponsored_collections_locales_parent_id_idx" ON "sponsored_collections_locales" USING btree ("_parent_id");
  CREATE INDEX "sponsored_collections_rels_order_idx" ON "sponsored_collections_rels" USING btree ("order");
  CREATE INDEX "sponsored_collections_rels_parent_idx" ON "sponsored_collections_rels" USING btree ("parent_id");
  CREATE INDEX "sponsored_collections_rels_path_idx" ON "sponsored_collections_rels" USING btree ("path");
  CREATE INDEX "sponsored_collections_rels_shorts_id_idx" ON "sponsored_collections_rels" USING btree ("shorts_id");
  ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sponsored_collections_fk" FOREIGN KEY ("sponsored_collections_id") REFERENCES "public"."sponsored_collections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "sponsors_logo_idx" ON "sponsors" USING btree ("logo_id");
  CREATE INDEX "payload_locked_documents_rels_sponsored_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("sponsored_collections_id");
  -- Every collection so far was chosen by hand: it stays so (empty filters would take them all).
  UPDATE "collections" SET "mode" = 'manual';

  -- Collections with a sponsor move to the sponsored ones, with their texts and shorts.
  DO $$
  DECLARE c record; new_id integer;
  BEGIN
    FOR c IN SELECT * FROM "collections" WHERE "sponsor_id" IS NOT NULL LOOP
      INSERT INTO "sponsored_collections" ("sponsor_id", "sponsorship_starts_at", "sponsorship_ends_at", "featured", "status", "sample", "updated_at", "created_at")
        VALUES (c.sponsor_id, c.sponsorship_starts_at, c.sponsorship_ends_at, c.featured, c.status::text::"enum_sponsored_collections_status", c.sample, c.updated_at, c.created_at)
        RETURNING "id" INTO new_id;
      INSERT INTO "sponsored_collections_locales" ("title", "slug", "description", "_locale", "_parent_id")
        SELECT "title", "slug", "description", "_locale", new_id FROM "collections_locales" WHERE "_parent_id" = c.id;
      INSERT INTO "sponsored_collections_rels" ("order", "parent_id", "path", "shorts_id")
        SELECT "order", new_id, "path", "shorts_id" FROM "collections_rels" WHERE "parent_id" = c.id AND "path" = 'shorts';
      DELETE FROM "collections" WHERE "id" = c.id;
    END LOOP;
  END $$;

  -- The five collections of the launch, by filters.
  UPDATE "collections" SET "mode" = 'rules', "rules_max_minutes" = 5
    WHERE "id" IN (SELECT "_parent_id" FROM "collections_locales" WHERE "_locale" = 'es' AND "slug" = 'cortisimos-menos-de-5-minutos');
  UPDATE "collections" SET "mode" = 'rules', "rules_region" = 'latin-america', "rules_year_from" = 2015
    WHERE "id" IN (SELECT "_parent_id" FROM "collections_locales" WHERE "_locale" = 'es' AND "slug" IN ('nueva-generacion-latinoamericana', 'desde-latinoamerica'));
  UPDATE "collections" SET "mode" = 'rules', "rules_with_awards" = true
    WHERE "id" IN (SELECT "_parent_id" FROM "collections_locales" WHERE "_locale" = 'es' AND "slug" = 'premiados-de-los-goya-al-oscar');
  UPDATE "collections" SET "mode" = 'rules'
    WHERE "id" IN (SELECT "_parent_id" FROM "collections_locales" WHERE "_locale" = 'es' AND "slug" IN ('animacion-de-autor', 'memorias-documental-y-vida-real'));
  INSERT INTO "collections_rules_types" ("order", "parent_id", "value")
    SELECT 1, "_parent_id", 'animation' FROM "collections_locales" WHERE "_locale" = 'es' AND "slug" = 'animacion-de-autor';
  INSERT INTO "collections_rules_channel_kinds" ("order", "parent_id", "value")
    SELECT k.ord, l."_parent_id", k.kind::"enum_collections_rules_channel_kinds"
    FROM "collections_locales" l, (VALUES (1, 'author'), (2, 'school')) AS k(ord, kind)
    WHERE l."_locale" = 'es' AND l."slug" = 'animacion-de-autor';
  INSERT INTO "collections_rules_types" ("order", "parent_id", "value")
    SELECT 1, "_parent_id", 'documentary' FROM "collections_locales" WHERE "_locale" = 'es' AND "slug" = 'memorias-documental-y-vida-real';

  -- The sponsor columns of "collections" stay for one release: the previous version still reads
  -- them while this one boots (docs/deploy.md). A later migration drops them.
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "collections_rules_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_rules_genres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_rules_themes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_rules_channel_kinds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sponsored_collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sponsored_collections_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sponsored_collections_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "collections_rules_types" CASCADE;
  DROP TABLE "collections_rules_genres" CASCADE;
  DROP TABLE "collections_rules_themes" CASCADE;
  DROP TABLE "collections_rules_channel_kinds" CASCADE;
  DROP TABLE "collections_texts" CASCADE;
  DROP TABLE "sponsored_collections" CASCADE;
  DROP TABLE "sponsored_collections_locales" CASCADE;
  DROP TABLE "sponsored_collections_rels" CASCADE;
  ALTER TABLE "sponsors" DROP CONSTRAINT "sponsors_logo_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sponsored_collections_fk";
  
  DROP INDEX "sponsors_logo_idx";
  DROP INDEX "payload_locked_documents_rels_sponsored_collections_id_idx";
  ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "sponsor_id" integer;
  ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "sponsorship_starts_at" timestamp(3) with time zone;
  ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "sponsorship_ends_at" timestamp(3) with time zone;
  ALTER TABLE "collections" DROP COLUMN "mode";
  ALTER TABLE "collections" DROP COLUMN "rules_region";
  ALTER TABLE "collections" DROP COLUMN "rules_min_minutes";
  ALTER TABLE "collections" DROP COLUMN "rules_max_minutes";
  ALTER TABLE "collections" DROP COLUMN "rules_year_from";
  ALTER TABLE "collections" DROP COLUMN "rules_year_to";
  ALTER TABLE "collections" DROP COLUMN "rules_original_language";
  ALTER TABLE "collections" DROP COLUMN "rules_spanish_subtitles";
  ALTER TABLE "collections" DROP COLUMN "rules_no_dialogue";
  ALTER TABLE "collections" DROP COLUMN "rules_all_audiences";
  ALTER TABLE "collections" DROP COLUMN "rules_with_awards";
  ALTER TABLE "collections" DROP COLUMN "sort";
  ALTER TABLE "collections" DROP COLUMN "rail_size";
  ALTER TABLE "sponsors" DROP COLUMN "logo_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sponsored_collections_id";
  DROP TYPE "public"."enum_collections_rules_types";
  DROP TYPE "public"."enum_collections_rules_genres";
  DROP TYPE "public"."enum_collections_rules_themes";
  DROP TYPE "public"."enum_collections_rules_channel_kinds";
  DROP TYPE "public"."enum_collections_mode";
  DROP TYPE "public"."enum_collections_rules_region";
  DROP TYPE "public"."enum_collections_sort";
  DROP TYPE "public"."enum_sponsored_collections_status";`)
}
