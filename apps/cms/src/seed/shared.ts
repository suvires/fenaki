import type { Payload } from 'payload'
import { searchClient } from '../search/client.ts'
import { SAMPLE_SHORTS, SAMPLE_SPONSOR } from './data.ts'

/**
 * Removes every sample document. People are removed only when no real short credits them:
 * the sample directors are real people, and the real catalog may credit them too.
 */
export async function removeSamples(payload: Payload): Promise<void> {
  const shorts = await payload.find({
    collection: 'shorts',
    where: { sample: { equals: true } },
    limit: 0,
    pagination: false,
    depth: 0,
  })
  const ids = shorts.docs.map((s) => s.id)
  await payload.delete({ collection: 'collections', where: { sample: { equals: true } } })
  await payload.delete({ collection: 'showcases', where: { sample: { equals: true } } })
  await payload.delete({ collection: 'media', where: { filename: { like: 'sample-logo' } } })
  if (ids.length > 0) {
    await payload.delete({ collection: 'sources', where: { short: { in: ids } } })
    await payload.delete({ collection: 'shorts', where: { id: { in: ids } } })
  }
  await payload.delete({ collection: 'licenses', where: { name: { like: '[sample]' } } })
  await payload.delete({ collection: 'sponsors', where: { name: { equals: SAMPLE_SPONSOR.name } } })

  const names = [...new Set(SAMPLE_SHORTS.flatMap((s) => s.directors))]
  const people = await payload.find({
    collection: 'people',
    where: { name: { in: names }, importKey: { exists: false } },
    limit: 0,
    pagination: false,
    depth: 0,
  })
  for (const person of people.docs) {
    const credited = await payload.count({
      collection: 'shorts',
      where: { 'credits.person': { equals: person.id } },
    })
    if (credited.totalDocs === 0) await payload.delete({ collection: 'people', id: person.id })
  }
}

/** Creates the admin user from SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, if it does not exist. */
export async function ensureAdmin(payload: Payload, log: (message: string) => void): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    log('SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set: skipping the admin user')
    return
  }
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } } })
  if (existing.totalDocs === 0) {
    await payload.create({ collection: 'users', data: { email, password, role: 'admin' } })
    log(`created admin user ${email}`)
  }
}

/** Runs the queued search sync jobs now, so search works before the jobs worker picks them up. */
export async function runSearchSync(payload: Payload, log: (message: string) => void) {
  let total = 0
  // Bounded: a failing job is retried a few times, then given up.
  for (let round = 0; round < 50; round++) {
    const result = await payload.jobs.run({ queue: 'default', limit: 100 })
    const ran = Object.keys(result.jobStatus ?? {}).length
    total += ran
    if (ran === 0 || result.noJobsRemaining) break
  }
  log(`ran ${total} search sync jobs`)
  // The jobs only enqueue the documents: Meilisearch indexes them on its own afterwards. Wait for
  // it, so whatever runs next (the e2e tests, a first search) finds every short.
  const pending = await searchClient().tasks.getTasks({
    statuses: ['enqueued', 'processing'],
    limit: 1000,
  })
  if (pending.results.length > 0) {
    await searchClient().tasks.waitForTasks(
      pending.results.map((task) => task.uid),
      { timeout: 60_000 },
    )
    log(`search indexes ready (${pending.results.length} tasks)`)
  }
}
