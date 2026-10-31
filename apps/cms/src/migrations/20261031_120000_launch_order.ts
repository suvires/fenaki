import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * The launch order of the catalog (31 Oct 2026). Every short was published in a few import batches
 * between 25 and 28 Oct, so «Novedades», the home's hero and the catalog's default order showed
 * them in import order. This dates them again, in the hour before the launch, so the newest are:
 *
 * 1. A head picked by hand: shorts by renowned filmmakers and producers (Goya winners and nominees,
 *    Kimuak, Autour de Minuit, Javier Fesser, Chema García Ibarra…), mixed so no one dominates.
 * 2. Then everything else by a score: awards (won above nominated, shortlisted and selected), a
 *    TMDB entry, who publishes it (renowned channels first, then authors and producers, festivals,
 *    institutions, schools; open-call contests last), a still, a running time that is not a
 *    micro-short, a synopsis, a recent year. Each further short of the same channel, and each
 *    repeat of a title, scores less, so the order mixes channels.
 *
 * Only shorts published before the launch move; the old dates stay in `launch_order_backup` and
 * `down` puts them back. Search and the site read the new dates after a reindex
 * (`pnpm --filter @fenaki/cms reindex`).
 */

/** The hand-picked head, first is newest (and the home's hero unless one is set in Portada). */
const HEAD = [
  11615, 171, 6021, 5962, 11611, 6071, 11614, 8585, 6072, 422, 11592, 20558, 6092, 476, 453,
  11610, 8581, 6098, 11587, 350, 11613, 6067, 8588, 125, 11586, 3812, 461, 490, 6083, 6095, 11616,
  247, 226, 175, 11578, 21018, 8597, 6074, 20159, 23930, 6096, 11590, 362, 124, 3913, 6104, 11566,
  8593, 357, 11612,
]

/** Renowned channels: festivals, producers, schools and filmmakers with a known name. */
const RENOWNED_CHANNELS = [
  2, 3, 8, 13, 17, 20, 21, 28, 29, 35, 36, 37, 38, 40, 42, 70, 76, 77, 78, 79, 81, 84, 85, 86, 97,
  98, 104, 116,
]

/** Open-call contests and channels of mostly amateur or classroom work. */
const OPEN_CALL_CHANNELS = [19, 92, 99, 101, 118, 119, 120, 122, 126]

const LAUNCH = sql.raw(`'2026-10-31T09:00:00Z'::timestamptz`)

const intArray = (ids: number[]) => sql.raw(`ARRAY[${ids.map((id) => Number(id)).join(',')}]::int[]`)

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS "launch_order_backup" ("id" integer PRIMARY KEY, "published_at" timestamptz)`,
  )
  await db.execute(sql`
  INSERT INTO "launch_order_backup" ("id", "published_at")
    SELECT "id", "published_at" FROM "shorts"
    WHERE "status" = 'published' AND "published_at" < ${LAUNCH}
  ON CONFLICT ("id") DO NOTHING`)
  await db.execute(sql`
  WITH awards AS (
    SELECT "_parent_id" AS id,
      least(count(*) FILTER (WHERE "result" = 'won'), 3) * 40
      + least(count(*) FILTER (WHERE "result" = 'nominated'), 3) * 15
      + least(count(*) FILTER (WHERE "result" = 'shortlisted'), 3) * 10
      + least(count(*) FILTER (WHERE "result" = 'selected'), 3) * 6 AS points
    FROM "shorts_awards" GROUP BY 1
  ),
  scored AS (
    SELECT s."id", s."ingest_channel_id" AS channel, l."title",
      array_position(${intArray(HEAD)}, s."id") AS head,
      coalesce(a.points, 0)
      + CASE WHEN s."tmdb_id" IS NOT NULL THEN 15 ELSE 0 END
      + CASE WHEN c."id" = ANY(${intArray(RENOWNED_CHANNELS)}) THEN 70
             WHEN c."kind" IN ('author', 'producer', 'distributor') THEN 15
             WHEN c."kind" = 'festival' THEN 8
             WHEN c."kind" = 'institution' THEN 5
             ELSE 0 END
      + CASE WHEN c."id" = ANY(${intArray(OPEN_CALL_CHANNELS)}) THEN -15 ELSE 0 END
      + CASE WHEN s."still_id" IS NULL THEN -200 ELSE 0 END
      + CASE WHEN s."duration_seconds" < 120 THEN -25
             WHEN s."duration_seconds" < 240 THEN -10
             WHEN s."duration_seconds" BETWEEN 420 AND 1800 THEN 10
             ELSE 0 END
      + CASE WHEN coalesce(l."synopsis", '') <> '' THEN 8 ELSE -5 END
      + CASE WHEN s."year" >= 2015 THEN 5 ELSE 0 END
      + CASE WHEN s."type" = 'animation' THEN 5 ELSE 0 END AS score
    FROM "shorts" s
    JOIN "launch_order_backup" b ON b."id" = s."id"
    JOIN "shorts_locales" l ON l."_parent_id" = s."id" AND l."_locale" = 'es'
    LEFT JOIN "channels" c ON c."id" = s."ingest_channel_id"
    LEFT JOIN awards a ON a.id = s."id"
    WHERE s."status" = 'published'
  ),
  mixed AS (
    SELECT "id", head,
      score
      - 10 * (row_number() OVER (PARTITION BY channel ORDER BY score DESC, "id" DESC) - 1)
      - 80 * (row_number() OVER (
          PARTITION BY lower(regexp_replace("title", '[^[:alnum:]]', '', 'g'))
          ORDER BY score DESC, "id" DESC) - 1) AS final
    FROM scored
  ),
  ordered AS (
    SELECT "id", row_number() OVER (
      ORDER BY head IS NULL, head, final DESC, "id" DESC) AS position
    FROM mixed
  )
  UPDATE "shorts" s
  SET "published_at" = ${LAUNCH} - (o.position * interval '20 seconds')
  FROM ordered o
  WHERE s."id" = o."id"`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "shorts" s SET "published_at" = b."published_at"
  FROM "launch_order_backup" b WHERE s."id" = b."id"`)
  await db.execute(sql`DROP TABLE IF EXISTS "launch_order_backup"`)
}
