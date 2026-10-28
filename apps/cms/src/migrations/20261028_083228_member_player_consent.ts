import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_members_player_consent" AS ENUM('youtube', 'vimeo');
  CREATE TABLE "members_player_consent" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_members_player_consent",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "members_player_consent" ADD CONSTRAINT "members_player_consent_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "members_player_consent_order_idx" ON "members_player_consent" USING btree ("order");
  CREATE INDEX "members_player_consent_parent_idx" ON "members_player_consent" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "members_player_consent" CASCADE;
  DROP TYPE "public"."enum_members_player_consent";`)
}
