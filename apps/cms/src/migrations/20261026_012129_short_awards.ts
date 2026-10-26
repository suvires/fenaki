import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_shorts_awards_result" AS ENUM('won', 'nominated', 'selected', 'shortlisted');
  CREATE TABLE "shorts_awards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"result" "enum_shorts_awards_result" DEFAULT 'won' NOT NULL,
  	"year" numeric,
  	"source" varchar NOT NULL
  );
  
  CREATE TABLE "shorts_awards_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "shorts_awards" ADD CONSTRAINT "shorts_awards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shorts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shorts_awards_locales" ADD CONSTRAINT "shorts_awards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shorts_awards"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shorts_awards_order_idx" ON "shorts_awards" USING btree ("_order");
  CREATE INDEX "shorts_awards_parent_id_idx" ON "shorts_awards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "shorts_awards_locales_locale_parent_id_unique" ON "shorts_awards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "shorts_awards_locales_parent_id_idx" ON "shorts_awards_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "shorts_awards" CASCADE;
  DROP TABLE "shorts_awards_locales" CASCADE;
  DROP TYPE "public"."enum_shorts_awards_result";`)
}
