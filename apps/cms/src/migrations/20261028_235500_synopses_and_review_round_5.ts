import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'
import review from './data/20261028_review.json' with { type: 'json' }
import synopses from './data/20261028_synopses.json' with { type: 'json' }

/**
 * The catalog pass of 28 oct 2026, written by Claude Code from each video's own description (no
 * API): a synopsis for the published shorts that had none and whose description said what they
 * are about, only where the synopsis is still empty, so an editor's text is never replaced; and
 * the fifth review round, the shorts waiting for review that are complete shorts in Spanish or
 * without dialogue (published) or not shorts at all (withdrawn). The rest stay in review.
 * Search and the embeddings of «Si te ha gustado» are refreshed by jobs.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const filled = await db.execute<{ id: number }>(sql`
  UPDATE "shorts_locales" l SET "synopsis" = d.value
  FROM json_each_text(${JSON.stringify(synopses.synopses)}::json) d
  WHERE l."_parent_id" = d.key::integer AND l."_locale" = 'es' AND coalesce(l."synopsis", '') = ''
  RETURNING l."_parent_id" AS id`)
  for (const row of filled.rows)
    await payload.jobs.queue({ task: 'indexShort', input: { shortId: Number(row.id) }, req })

  for (const short of review.publish) {
    const current = await payload.findByID({
      collection: 'shorts',
      id: short.id,
      locale: 'es',
      depth: 0,
      disableErrors: true,
      req,
    })
    if (current?.status !== 'review') continue
    await payload.update({
      collection: 'shorts',
      id: short.id,
      locale: 'es',
      data: {
        status: 'published',
        type: short.type as 'fiction',
        originalLanguage: short.language,
        languageSource: 'editor',
        ...(short.language === 'zxx' ? { noDialogue: true } : {}),
        ...('year' in short && !current.year ? { year: short.year as number } : {}),
        ...('synopsis' in short && !current.synopsis ? { synopsis: short.synopsis as string } : {}),
      },
      req,
    })
  }
  for (const id of review.withdraw)
    await payload.update({
      collection: 'shorts',
      where: { id: { equals: id }, status: { equals: 'review' } },
      data: { status: 'withdrawn' },
      req,
    })

  await payload.jobs.queue({ task: 'embedShorts', input: {}, queue: 'long', req })
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
