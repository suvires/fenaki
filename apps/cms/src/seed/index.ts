/**
 * Loads the sample catalog. Idempotent: removes earlier sample data first.
 * Run with `pnpm seed` (from the repository root).
 */
import config from '@payload-config'
import { getPayload } from 'payload'
import { slugify } from '../fields/slug.ts'
import { SAMPLE_COLLECTION, SAMPLE_SHORTS, SAMPLE_SPONSOR } from './data.ts'

const payload = await getPayload({ config })
const log = (message: string) => payload.logger.info(`seed: ${message}`)

async function removeSamples() {
  const shorts = await payload.find({
    collection: 'shorts',
    where: { sample: { equals: true } },
    limit: 0,
    pagination: false,
    depth: 0,
  })
  const ids = shorts.docs.map((s) => s.id)
  await payload.delete({ collection: 'collections', where: { sample: { equals: true } } })
  if (ids.length > 0) {
    await payload.delete({ collection: 'sources', where: { short: { in: ids } } })
    await payload.delete({ collection: 'shorts', where: { id: { in: ids } } })
  }
  await payload.delete({ collection: 'licenses', where: { name: { like: '[sample]' } } })
  await payload.delete({ collection: 'sponsors', where: { name: { equals: SAMPLE_SPONSOR.name } } })
  const names = [...new Set(SAMPLE_SHORTS.flatMap((s) => s.directors))]
  await payload.delete({ collection: 'people', where: { name: { in: names } } })
}

async function ensureAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    log('SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set: skipping the admin user')
    return
  }
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } } })
  if (existing.totalDocs === 0) {
    await payload.create({ collection: 'users', data: { email, password } })
    log(`created admin user ${email}`)
  }
}

await removeSamples()
await ensureAdmin()

const people = new Map<string, number>()
for (const name of new Set(SAMPLE_SHORTS.flatMap((s) => s.directors))) {
  const person = await payload.create({ collection: 'people', data: { name, slug: slugify(name) } })
  people.set(name, person.id)
}
const personId = (name: string) => {
  const id = people.get(name)
  if (id === undefined) throw new Error(`Unknown sample person ${name}`)
  return id
}

const shortIds: number[] = []
for (const sample of SAMPLE_SHORTS) {
  const short = await payload.create({
    collection: 'shorts',
    locale: 'es',
    data: {
      title: sample.title,
      slug: slugify(sample.title),
      synopsis: sample.synopsis,
      durationSeconds: sample.durationSeconds,
      year: sample.year,
      country: sample.country,
      originalLanguage: sample.originalLanguage,
      type: sample.type,
      noDialogue: sample.noDialogue,
      posterTone: sample.posterTone,
      credits: sample.directors.map((name) => ({ person: personId(name), role: 'director' })),
      status: 'published',
      publishedAt: sample.publishedAt,
      sample: true,
    },
  })
  const license = await payload.create({
    collection: 'licenses',
    data: {
      name: `[sample] YouTube embed: ${sample.title}`,
      route: 'embed',
      type: 'platform-terms',
      notes: 'Sample data. Not verified on an official channel.',
    },
  })
  const externalId = `sample-${slugify(sample.title)}`
  await payload.create({
    collection: 'sources',
    data: {
      short: short.id,
      provider: 'youtube',
      externalId,
      subtitles: sample.subtitles,
      embeddable: true,
      status: 'unchecked',
      license: license.id,
    },
  })
  shortIds.push(short.id)
}
log(`created ${shortIds.length} sample shorts with sources and licenses`)

const sponsor = await payload.create({ collection: 'sponsors', data: SAMPLE_SPONSOR })
await payload.create({
  collection: 'collections',
  locale: 'es',
  data: {
    title: SAMPLE_COLLECTION.title,
    slug: slugify(SAMPLE_COLLECTION.title),
    description: SAMPLE_COLLECTION.description,
    shorts: shortIds,
    featured: true,
    status: 'published',
    sponsor: sponsor.id,
    sponsorshipStartsAt: SAMPLE_COLLECTION.sponsorshipStartsAt,
    sponsorshipEndsAt: SAMPLE_COLLECTION.sponsorshipEndsAt,
    sample: true,
  },
})
log('created the sponsored sample collection')

// Index now so search works before the jobs worker picks anything up.
const result = await payload.jobs.run({ queue: 'default', limit: 100 })
log(`ran ${Object.keys(result.jobStatus ?? {}).length} search sync jobs`)

process.exit(0)
