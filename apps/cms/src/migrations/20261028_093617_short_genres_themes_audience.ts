import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_shorts_genres" AS ENUM('drama', 'comedy', 'horror', 'thriller', 'science-fiction', 'fantasy', 'romance', 'action-adventure', 'musical-dance');
  CREATE TYPE "public"."enum_shorts_themes" AS ENUM('society', 'lgbtiq', 'family', 'memory-history', 'nature-environment', 'sport');
  CREATE TYPE "public"."enum_shorts_ai_review_genres" AS ENUM('drama', 'comedy', 'horror', 'thriller', 'science-fiction', 'fantasy', 'romance', 'action-adventure', 'musical-dance');
  CREATE TYPE "public"."enum_shorts_ai_review_themes" AS ENUM('society', 'lgbtiq', 'family', 'memory-history', 'nature-environment', 'sport');
  CREATE TABLE "shorts_genres" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_shorts_genres",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "shorts_themes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_shorts_themes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "shorts_ai_review_genres" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_shorts_ai_review_genres",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "shorts_ai_review_themes" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_shorts_ai_review_themes",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "shorts" ADD COLUMN "all_audiences" boolean DEFAULT false;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_all_audiences" boolean;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_title_in_thumbnail" boolean;
  ALTER TABLE "shorts_genres" ADD CONSTRAINT "shorts_genres_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shorts_themes" ADD CONSTRAINT "shorts_themes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shorts_ai_review_genres" ADD CONSTRAINT "shorts_ai_review_genres_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shorts_ai_review_themes" ADD CONSTRAINT "shorts_ai_review_themes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shorts_genres_order_idx" ON "shorts_genres" USING btree ("order");
  CREATE INDEX "shorts_genres_parent_idx" ON "shorts_genres" USING btree ("parent_id");
  CREATE INDEX "shorts_themes_order_idx" ON "shorts_themes" USING btree ("order");
  CREATE INDEX "shorts_themes_parent_idx" ON "shorts_themes" USING btree ("parent_id");
  CREATE INDEX "shorts_ai_review_genres_order_idx" ON "shorts_ai_review_genres" USING btree ("order");
  CREATE INDEX "shorts_ai_review_genres_parent_idx" ON "shorts_ai_review_genres" USING btree ("parent_id");
  CREATE INDEX "shorts_ai_review_themes_order_idx" ON "shorts_ai_review_themes" USING btree ("order");
  CREATE INDEX "shorts_ai_review_themes_parent_idx" ON "shorts_ai_review_themes" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "shorts_genres" CASCADE;
  DROP TABLE "shorts_themes" CASCADE;
  DROP TABLE "shorts_ai_review_genres" CASCADE;
  DROP TABLE "shorts_ai_review_themes" CASCADE;
  ALTER TABLE "shorts" DROP COLUMN "all_audiences";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_all_audiences";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_title_in_thumbnail";
  DROP TYPE "public"."enum_shorts_genres";
  DROP TYPE "public"."enum_shorts_themes";
  DROP TYPE "public"."enum_shorts_ai_review_genres";
  DROP TYPE "public"."enum_shorts_ai_review_themes";`)
}
