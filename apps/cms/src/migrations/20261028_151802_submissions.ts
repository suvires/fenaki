import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** «Sube tu corto»: the submissions members send, waiting for the code and for review. */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_submissions_provider" AS ENUM('youtube', 'vimeo');
  CREATE TYPE "public"."enum_submissions_relation" AS ENUM('author', 'producer', 'distributor', 'festival', 'school', 'institution');
  CREATE TYPE "public"."enum_submissions_status" AS ENUM('awaiting-code', 'in-review', 'approved', 'rejected');
  CREATE TABLE "submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"video_title" varchar,
  	"url" varchar NOT NULL,
  	"provider" "enum_submissions_provider" NOT NULL,
  	"external_id" varchar NOT NULL,
  	"relation" "enum_submissions_relation" NOT NULL,
  	"note" varchar,
  	"code" varchar NOT NULL,
  	"status" "enum_submissions_status" DEFAULT 'awaiting-code' NOT NULL,
  	"reason" varchar,
  	"short_id" integer,
  	"accepted_terms_at" timestamp(3) with time zone NOT NULL,
  	"verified_at" timestamp(3) with time zone,
  	"notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "submissions_id" integer;
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_short_id_shorts_id_fk" FOREIGN KEY ("short_id") REFERENCES "public"."shorts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "submissions_member_idx" ON "submissions" USING btree ("member_id");
  CREATE INDEX "submissions_external_id_idx" ON "submissions" USING btree ("external_id");
  CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");
  CREATE INDEX "submissions_short_idx" ON "submissions" USING btree ("short_id");
  CREATE INDEX "submissions_updated_at_idx" ON "submissions" USING btree ("updated_at");
  CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk" FOREIGN KEY ("submissions_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "submissions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "submissions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_submissions_fk";
  
  DROP INDEX "payload_locked_documents_rels_submissions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "submissions_id";
  DROP TYPE "public"."enum_submissions_provider";
  DROP TYPE "public"."enum_submissions_relation";
  DROP TYPE "public"."enum_submissions_status";`)
}
