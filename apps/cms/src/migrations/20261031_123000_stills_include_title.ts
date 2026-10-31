import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * The provider stills whose short's AI review found the title written on the thumbnail, but that
 * were downloaded after the review (by the nightly embed check), so the review could not mark
 * them: cards and the hero drew the title on top of the one in the image. 1,191 stills on
 * 31 Oct 2026. New stills take the finding when they are created (checkEmbeds.ts). Only provider
 * stills move from false to true: an author's still and an editor's choice stay as they are.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "stills" st SET "includes_title" = true
  FROM "shorts" s
  WHERE s."still_id" = st."id"
    AND s."ai_review_title_in_thumbnail" = true
    AND st."origin" = 'provider'
    AND st."includes_title" = false`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
