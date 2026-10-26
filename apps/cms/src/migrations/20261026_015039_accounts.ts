import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ratings_value" AS ENUM('dislike', 'like', 'love');
  CREATE TABLE "members_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"sample" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "list_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"short_id" integer NOT NULL,
  	"saved_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ratings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"short_id" integer NOT NULL,
  	"value" "enum_ratings_value" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "viewings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"short_id" integer NOT NULL,
  	"position_seconds" numeric DEFAULT 0 NOT NULL,
  	"duration_seconds" numeric DEFAULT 0 NOT NULL,
  	"completed" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "members_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "list_items_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ratings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "viewings_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "members_id" integer;
  ALTER TABLE "members_sessions" ADD CONSTRAINT "members_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "list_items" ADD CONSTRAINT "list_items_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "list_items" ADD CONSTRAINT "list_items_short_id_shorts_id_fk" FOREIGN KEY ("short_id") REFERENCES "public"."shorts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ratings" ADD CONSTRAINT "ratings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ratings" ADD CONSTRAINT "ratings_short_id_shorts_id_fk" FOREIGN KEY ("short_id") REFERENCES "public"."shorts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "viewings" ADD CONSTRAINT "viewings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "viewings" ADD CONSTRAINT "viewings_short_id_shorts_id_fk" FOREIGN KEY ("short_id") REFERENCES "public"."shorts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "members_sessions_order_idx" ON "members_sessions" USING btree ("_order");
  CREATE INDEX "members_sessions_parent_id_idx" ON "members_sessions" USING btree ("_parent_id");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE UNIQUE INDEX "members_email_idx" ON "members" USING btree ("email");
  CREATE INDEX "list_items_member_idx" ON "list_items" USING btree ("member_id");
  CREATE INDEX "list_items_short_idx" ON "list_items" USING btree ("short_id");
  CREATE INDEX "list_items_updated_at_idx" ON "list_items" USING btree ("updated_at");
  CREATE INDEX "list_items_created_at_idx" ON "list_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "member_short_idx" ON "list_items" USING btree ("member_id","short_id");
  CREATE INDEX "ratings_member_idx" ON "ratings" USING btree ("member_id");
  CREATE INDEX "ratings_short_idx" ON "ratings" USING btree ("short_id");
  CREATE INDEX "ratings_updated_at_idx" ON "ratings" USING btree ("updated_at");
  CREATE INDEX "ratings_created_at_idx" ON "ratings" USING btree ("created_at");
  CREATE UNIQUE INDEX "member_short_1_idx" ON "ratings" USING btree ("member_id","short_id");
  CREATE INDEX "viewings_member_idx" ON "viewings" USING btree ("member_id");
  CREATE INDEX "viewings_short_idx" ON "viewings" USING btree ("short_id");
  CREATE INDEX "viewings_updated_at_idx" ON "viewings" USING btree ("updated_at");
  CREATE INDEX "viewings_created_at_idx" ON "viewings" USING btree ("created_at");
  CREATE UNIQUE INDEX "member_short_2_idx" ON "viewings" USING btree ("member_id","short_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_list_items_fk" FOREIGN KEY ("list_items_id") REFERENCES "public"."list_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ratings_fk" FOREIGN KEY ("ratings_id") REFERENCES "public"."ratings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_viewings_fk" FOREIGN KEY ("viewings_id") REFERENCES "public"."viewings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_locked_documents_rels_list_items_id_idx" ON "payload_locked_documents_rels" USING btree ("list_items_id");
  CREATE INDEX "payload_locked_documents_rels_ratings_id_idx" ON "payload_locked_documents_rels" USING btree ("ratings_id");
  CREATE INDEX "payload_locked_documents_rels_viewings_id_idx" ON "payload_locked_documents_rels" USING btree ("viewings_id");
  CREATE INDEX "payload_preferences_rels_members_id_idx" ON "payload_preferences_rels" USING btree ("members_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ratings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "viewings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "members_sessions" CASCADE;
  DROP TABLE "members" CASCADE;
  DROP TABLE "list_items" CASCADE;
  DROP TABLE "ratings" CASCADE;
  DROP TABLE "viewings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_members_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_list_items_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ratings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_viewings_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_members_fk";
  
  DROP INDEX "payload_locked_documents_rels_members_id_idx";
  DROP INDEX "payload_locked_documents_rels_list_items_id_idx";
  DROP INDEX "payload_locked_documents_rels_ratings_id_idx";
  DROP INDEX "payload_locked_documents_rels_viewings_id_idx";
  DROP INDEX "payload_preferences_rels_members_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "members_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "list_items_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ratings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "viewings_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "members_id";
  DROP TYPE "public"."enum_ratings_value";`)
}
