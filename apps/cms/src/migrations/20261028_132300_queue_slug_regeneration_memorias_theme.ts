import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * After the catalog pass: «Memorias» also filters by the theme it is about, now that shorts have
 * themes; and the slugs of the shorts whose title the pass cleaned are regenerated, by a job (the
 * worker runs it, so the deploy does not wait for thousands of updates).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  INSERT INTO "collections_rules_themes" ("order", "parent_id", "value")
    SELECT 1, "_parent_id", 'memory-history' FROM "collections_locales"
    WHERE "_locale" = 'es' AND "slug" = 'memorias-documental-y-vida-real'
      AND NOT EXISTS (SELECT 1 FROM "collections_rules_themes" t WHERE t."parent_id" = "collections_locales"."_parent_id");`)
  await payload.jobs.queue({ task: 'regenerateSlugs', input: {}, req })
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DELETE FROM "collections_rules_themes" WHERE "value" = 'memory-history' AND "parent_id" IN (
    SELECT "_parent_id" FROM "collections_locales" WHERE "_locale" = 'es' AND "slug" = 'memorias-documental-y-vida-real'
  );`)
}
