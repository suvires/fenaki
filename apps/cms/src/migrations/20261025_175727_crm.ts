import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_organizations_type" AS ENUM('festival', 'school', 'brand', 'institution', 'other');
  CREATE TYPE "public"."enum_organizations_priority" AS ENUM('A', 'B', 'C');
  CREATE TYPE "public"."enum_organizations_status" AS ENUM('to_contact', 'contacted', 'replied', 'proposal', 'negotiation', 'won', 'lost', 'not_interested');
  CREATE TYPE "public"."enum_organizations_recommended_product" AS ENUM('showcase', 'collection', 'sponsorship', 'other');
  CREATE TYPE "public"."enum_contacts_legal_basis" AS ENUM('published_for_proposals', 'existing_relationship', 'wrote_first', 'other');
  CREATE TYPE "public"."enum_messages_direction" AS ENUM('outbound', 'inbound');
  CREATE TYPE "public"."enum_messages_status" AS ENUM('draft', 'approved', 'sending', 'sent', 'failed', 'received');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'agent');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'syncInbox';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'syncInbox';
  CREATE TABLE "organizations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "enum_organizations_type" DEFAULT 'other' NOT NULL,
  	"priority" "enum_organizations_priority" DEFAULT 'B',
  	"status" "enum_organizations_status" DEFAULT 'to_contact' NOT NULL,
  	"country" varchar,
  	"city" varchar,
  	"website" varchar,
  	"proposals_channel" varchar,
  	"next_edition" varchar,
  	"why_fits" varchar,
  	"recommended_product" "enum_organizations_recommended_product",
  	"source" varchar,
  	"notes" varchar,
  	"last_contact_date" timestamp(3) with time zone,
  	"next_follow_up_date" timestamp(3) with time zone,
  	"sponsor_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contacts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"name" varchar,
  	"role" varchar,
  	"organization_id" integer NOT NULL,
  	"legal_basis" "enum_contacts_legal_basis" NOT NULL,
  	"legal_evidence" varchar NOT NULL,
  	"do_not_contact" boolean DEFAULT false,
  	"do_not_contact_date" timestamp(3) with time zone,
  	"do_not_contact_reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "messages_attachment_names" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar
  );
  
  CREATE TABLE "messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"direction" "enum_messages_direction" DEFAULT 'outbound' NOT NULL,
  	"status" "enum_messages_status" DEFAULT 'draft' NOT NULL,
  	"organization_id" integer NOT NULL,
  	"contact_id" integer,
  	"subject" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"replying_to_id" integer,
  	"follow_up_date" timestamp(3) with time zone,
  	"handled" boolean DEFAULT false,
  	"sent_at" timestamp(3) with time zone,
  	"received_at" timestamp(3) with time zone,
  	"message_id" varchar,
  	"in_reply_to" varchar,
  	"references" varchar,
  	"error" varchar,
  	"approved_by_id" integer,
  	"approved_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "crm_inbox" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uid_validity" varchar,
  	"last_uid" numeric,
  	"last_run_at" timestamp(3) with time zone,
  	"last_error" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'agent' NOT NULL;
  -- Everyone who could sign in before this migration is the human: they become admins.
  UPDATE "users" SET "role" = 'admin';
  ALTER TABLE "users" ADD COLUMN "enable_a_p_i_key" boolean;
  ALTER TABLE "users" ADD COLUMN "api_key" varchar;
  ALTER TABLE "users" ADD COLUMN "api_key_index" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "organizations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contacts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "messages_id" integer;
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages_attachment_names" ADD CONSTRAINT "messages_attachment_names_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_replying_to_id_messages_id_fk" FOREIGN KEY ("replying_to_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");
  CREATE INDEX "organizations_priority_idx" ON "organizations" USING btree ("priority");
  CREATE INDEX "organizations_status_idx" ON "organizations" USING btree ("status");
  CREATE INDEX "organizations_next_follow_up_date_idx" ON "organizations" USING btree ("next_follow_up_date");
  CREATE INDEX "organizations_sponsor_idx" ON "organizations" USING btree ("sponsor_id");
  CREATE INDEX "organizations_updated_at_idx" ON "organizations" USING btree ("updated_at");
  CREATE INDEX "organizations_created_at_idx" ON "organizations" USING btree ("created_at");
  CREATE UNIQUE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");
  CREATE INDEX "contacts_organization_idx" ON "contacts" USING btree ("organization_id");
  CREATE INDEX "contacts_do_not_contact_idx" ON "contacts" USING btree ("do_not_contact");
  CREATE INDEX "contacts_updated_at_idx" ON "contacts" USING btree ("updated_at");
  CREATE INDEX "contacts_created_at_idx" ON "contacts" USING btree ("created_at");
  CREATE INDEX "messages_attachment_names_order_idx" ON "messages_attachment_names" USING btree ("_order");
  CREATE INDEX "messages_attachment_names_parent_id_idx" ON "messages_attachment_names" USING btree ("_parent_id");
  CREATE INDEX "messages_direction_idx" ON "messages" USING btree ("direction");
  CREATE INDEX "messages_status_idx" ON "messages" USING btree ("status");
  CREATE INDEX "messages_organization_idx" ON "messages" USING btree ("organization_id");
  CREATE INDEX "messages_contact_idx" ON "messages" USING btree ("contact_id");
  CREATE INDEX "messages_replying_to_idx" ON "messages" USING btree ("replying_to_id");
  CREATE INDEX "messages_handled_idx" ON "messages" USING btree ("handled");
  CREATE INDEX "messages_sent_at_idx" ON "messages" USING btree ("sent_at");
  CREATE INDEX "messages_received_at_idx" ON "messages" USING btree ("received_at");
  CREATE INDEX "messages_message_id_idx" ON "messages" USING btree ("message_id");
  CREATE INDEX "messages_approved_by_idx" ON "messages" USING btree ("approved_by_id");
  CREATE INDEX "messages_updated_at_idx" ON "messages" USING btree ("updated_at");
  CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_organizations_fk" FOREIGN KEY ("organizations_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contacts_fk" FOREIGN KEY ("contacts_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_messages_fk" FOREIGN KEY ("messages_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_organizations_id_idx" ON "payload_locked_documents_rels" USING btree ("organizations_id");
  CREATE INDEX "payload_locked_documents_rels_contacts_id_idx" ON "payload_locked_documents_rels" USING btree ("contacts_id");
  CREATE INDEX "payload_locked_documents_rels_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("messages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organizations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "messages_attachment_names" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "crm_inbox" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "organizations" CASCADE;
  DROP TABLE "contacts" CASCADE;
  DROP TABLE "messages_attachment_names" CASCADE;
  DROP TABLE "messages" CASCADE;
  DROP TABLE "crm_inbox" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_organizations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contacts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_messages_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'indexShort', 'purgeWaitlist', 'checkEmbeds');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_organizations_id_idx";
  DROP INDEX "payload_locked_documents_rels_contacts_id_idx";
  DROP INDEX "payload_locked_documents_rels_messages_id_idx";
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "users" DROP COLUMN "enable_a_p_i_key";
  ALTER TABLE "users" DROP COLUMN "api_key";
  ALTER TABLE "users" DROP COLUMN "api_key_index";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "organizations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contacts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "messages_id";
  DROP TYPE "public"."enum_organizations_type";
  DROP TYPE "public"."enum_organizations_priority";
  DROP TYPE "public"."enum_organizations_status";
  DROP TYPE "public"."enum_organizations_recommended_product";
  DROP TYPE "public"."enum_contacts_legal_basis";
  DROP TYPE "public"."enum_messages_direction";
  DROP TYPE "public"."enum_messages_status";
  DROP TYPE "public"."enum_users_role";`)
}
