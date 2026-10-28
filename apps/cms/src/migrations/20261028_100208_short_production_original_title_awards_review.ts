import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_shorts_ai_review_awards_result" AS ENUM('won', 'nominated', 'selected', 'shortlisted');
  CREATE TABLE "shorts_ai_review_awards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"result" "enum_shorts_ai_review_awards_result",
  	"year" numeric
  );
  
  ALTER TABLE "shorts" ADD COLUMN "original_title" varchar;
  ALTER TABLE "shorts" ADD COLUMN "production" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_original_title" varchar;
  ALTER TABLE "shorts" ADD COLUMN "ai_review_production" varchar;
  ALTER TABLE "shorts_ai_review_awards" ADD CONSTRAINT "shorts_ai_review_awards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shorts_ai_review_awards_order_idx" ON "shorts_ai_review_awards" USING btree ("_order");
  CREATE INDEX "shorts_ai_review_awards_parent_id_idx" ON "shorts_ai_review_awards" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "shorts_ai_review_awards" CASCADE;
  ALTER TABLE "shorts" DROP COLUMN "original_title";
  ALTER TABLE "shorts" DROP COLUMN "production";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_original_title";
  ALTER TABLE "shorts" DROP COLUMN "ai_review_production";
  DROP TYPE "public"."enum_shorts_ai_review_awards_result";`)
}
