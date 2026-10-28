import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** «Animación de autor» leaves FENAKI's collections (its texts and filters go with it). */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DELETE FROM "collections" WHERE "id" IN (
    SELECT "_parent_id" FROM "collections_locales" WHERE "_locale" = 'es' AND "slug" = 'animacion-de-autor'
  );`)
}

/** Nothing to bring back: the collection was removed on purpose. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
