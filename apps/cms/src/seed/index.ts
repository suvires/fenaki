/**
 * Loads the sample catalog. Idempotent: removes earlier sample data first.
 * Run with `pnpm seed` (from the repository root).
 */
import config from '@payload-config'
import { getPayload } from 'payload'
import { slugify } from '../fields/slug.ts'
import sharp from 'sharp'
import { SAMPLE_COLLECTION, SAMPLE_SHORTS, SAMPLE_SHOWCASE, SAMPLE_SPONSOR } from './data.ts'
import { ensureAdmin, removeSamples, runSearchSync } from './shared.ts'

const payload = await getPayload({ config })
const log = (message: string) => payload.logger.info(`seed: ${message}`)

// The sample shorts share slugs with real ones (Cuerdas, Alike): never mix them in one database.
const real = await payload.count({ collection: 'shorts', where: { sample: { equals: false } } })
if (real.totalDocs > 0) {
  payload.logger.error(
    `seed: this database has ${real.totalDocs} real shorts. The sample seed is for an empty or sample-only database (the e2e tests use their own).`,
  )
  process.exit(1)
}

await removeSamples(payload)
await ensureAdmin(payload, log)

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
      channel: { name: `[sample] ${sample.directors.join(', ')}`, kind: 'author' },
      officialEvidence: 'Sample data. Not verified on an official channel.',
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

// A plain typographic logo, generated: no real organization's mark.
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160"><rect width="480" height="160" fill="#f4efe6"/><text x="240" y="96" font-family="sans-serif" font-size="40" font-weight="700" text-anchor="middle" fill="#1a1714">ESCUELA · EJEMPLO</text></svg>`
const logoPng = await sharp(Buffer.from(logoSvg)).png().toBuffer()
const logo = await payload.create({
  collection: 'media',
  locale: 'es',
  data: { alt: SAMPLE_SHOWCASE.name },
  file: { data: logoPng, mimetype: 'image/png', name: 'sample-logo.png', size: logoPng.length },
})
const titles = new Map(SAMPLE_SHORTS.map((sample, index) => [sample.title, shortIds[index]]))
await payload.create({
  collection: 'showcases',
  locale: 'es',
  data: {
    name: SAMPLE_SHOWCASE.name,
    slug: slugify(SAMPLE_SHOWCASE.name),
    kind: SAMPLE_SHOWCASE.kind,
    website: SAMPLE_SHOWCASE.website,
    intro: SAMPLE_SHOWCASE.intro,
    logo: logo.id,
    shorts: SAMPLE_SHOWCASE.shorts.map((title) => {
      const id = titles.get(title)
      if (id === undefined) throw new Error(`Unknown sample short ${title}`)
      return id
    }),
    presentedBy: sponsor.id,
    status: 'published',
    sample: true,
  },
})
log('created the sample showcase')

await runSearchSync(payload, log)

process.exit(0)
