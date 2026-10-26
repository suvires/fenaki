import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_short_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "home" ADD CONSTRAINT "home_hero_short_id_shorts_id_fk" FOREIGN KEY ("hero_short_id") REFERENCES "public"."shorts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "home_hero_short_idx" ON "home" USING btree ("hero_short_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home" CASCADE;`)
}
