/**
 * Measures the text colour of the stills that have not been measured yet (those created before the
 * field existed, and author stills, which the nightly checker never touches). The colour an editor
 * chose is kept. Safe to run again: `pnpm --filter @fenaki/cms backfill:still-text`.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import config from '@payload-config'
import { getPayload } from 'payload'
import { measureTextColor } from './stills.ts'

const payload = await getPayload({ config })
const stills = await payload.find({
  collection: 'stills',
  depth: 0,
  limit: 0,
  pagination: false,
})
let measured = 0
for (const still of stills.docs) {
  if (still.textColorAuto || !still.filename) continue
  try {
    const bytes = await readFile(path.resolve(process.cwd(), 'media/stills', still.filename))
    const { color } = await measureTextColor(bytes)
    await payload.update({
      collection: 'stills',
      id: still.id,
      data: {
        textColorAuto: color,
        ...(still.textColorSet === 'manual' ? {} : { textColor: color }),
      },
      context: { textColorScript: true },
    })
    measured += 1
  } catch (error) {
    payload.logger.warn(`backfill:still-text: still ${still.id}: ${(error as Error).message}`)
  }
}
payload.logger.info(`backfill:still-text: ${measured} of ${stills.docs.length} stills measured`)
process.exit(0)
