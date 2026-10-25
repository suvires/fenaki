/**
 * Imports the real catalog from the JSON file at CATALOG_IMPORT_PATH (outside this repository).
 * Idempotent: documents are matched by their import key, so running it again updates them and
 * never duplicates. The sample data is removed first; the real catalog replaces it.
 * Run with `pnpm import:catalog` (from the repository root).
 */
import config from '@payload-config'
import { defaultLocale } from '@shortix/i18n'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload, type CollectionSlug, type Where } from 'payload'
import { ensureAdmin, removeSamples, runSearchSync } from '../seed/shared.ts'
import {
  collectionData,
  collectionStatus,
  licenseData,
  parseImportFile,
  personData,
  shortData,
  shortStatus,
  sourceData,
  type ShortStatus,
} from './catalog.ts'

const payload = await getPayload({ config })
const log = (message: string) => payload.logger.info(`import: ${message}`)

const filePath = process.env.CATALOG_IMPORT_PATH
if (!filePath) {
  payload.logger.error('import: set CATALOG_IMPORT_PATH to the catalog import.json file')
  process.exit(1)
}
const file = parseImportFile(
  JSON.parse(await readFile(path.resolve(filePath), 'utf8')),
  defaultLocale,
)
log(
  `read ${file.shorts.length} shorts, ${file.sources.length} sources, ${file.people.length} people, ${file.licenses.length} licenses and ${file.collections.length} collections`,
)

type Counts = { created: number; updated: number }
const counts = new Map<CollectionSlug, Counts>()

/**
 * Creates or updates the document with this import key. When none has it yet, `adopt` finds an
 * existing document to take over (people added by hand before the import, matched by slug).
 */
async function upsert(
  collection: CollectionSlug,
  importKey: string,
  data: Record<string, unknown>,
  adopt?: Where,
): Promise<{ id: number; status?: unknown }> {
  const tally = counts.get(collection) ?? { created: 0, updated: 0 }
  counts.set(collection, tally)
  const find = async (where: Where) =>
    (await payload.find({ collection, where, limit: 1, depth: 0, locale: defaultLocale }))
      .docs[0] as { id: number; status?: unknown } | undefined
  const existing =
    (await find({ importKey: { equals: importKey } })) ?? (adopt ? await find(adopt) : undefined)
  if (existing) {
    tally.updated += 1
    return (await payload.update({
      collection,
      id: existing.id,
      data,
      depth: 0,
      locale: defaultLocale,
    })) as { id: number }
  }
  tally.created += 1
  return (await payload.create({ collection, data, depth: 0, locale: defaultLocale })) as {
    id: number
  }
}

function lookup(ids: Map<string, number>, kind: string) {
  return (key: string) => {
    const id = ids.get(key)
    if (id === undefined) throw new Error(`No ${kind} imported for key "${key}"`)
    return id
  }
}

await removeSamples(payload)
await ensureAdmin(payload, log)

const people = new Map<string, number>()
for (const person of file.people) {
  const doc = await upsert('people', person.key, personData(person), {
    slug: { equals: person.slug },
  })
  people.set(person.key, doc.id)
}

const licenses = new Map<string, number>()
for (const license of file.licenses) {
  licenses.set(license.key, (await upsert('licenses', license.key, licenseData(license))).id)
}

const shorts = new Map<string, number>()
const launched = new Set<string>()
for (const short of file.shorts) {
  const current = (
    await payload.find({
      collection: 'shorts',
      where: { importKey: { equals: short.key } },
      limit: 1,
      depth: 0,
    })
  ).docs[0]
  const status = shortStatus(short, current?.status as ShortStatus | undefined)
  if (status === 'published') launched.add(short.key)
  const doc = await upsert('shorts', short.key, shortData(short, lookup(people, 'person'), status))
  shorts.set(short.key, doc.id)
}

for (const source of file.sources) {
  await upsert(
    'sources',
    source.key,
    sourceData(source, lookup(shorts, 'short'), lookup(licenses, 'license')),
  )
}

for (const collection of file.collections) {
  await upsert(
    'collections',
    collection.key,
    collectionData(collection, lookup(shorts, 'short'), collectionStatus(collection, launched)),
  )
}

for (const [collection, tally] of counts) {
  log(`${collection}: ${tally.created} created, ${tally.updated} updated`)
}
log(`${launched.size} shorts published, ${file.shorts.length - launched.size} kept as drafts`)

await runSearchSync(payload, log)

process.exit(0)
