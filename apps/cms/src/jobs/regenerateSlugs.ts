import type { PayloadRequest, TaskConfig } from 'payload'
import { slugify } from '../fields/slug.ts'

/** The model the catalog pass recorded: only the shorts it cleaned get a new slug. */
const PASS_MODEL = 'claude-code-pass'

/** A slug no other short uses now or used before (a used one still redirects). */
async function freeSlug(req: PayloadRequest, base: string, shortId: number): Promise<string> {
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    const taken = await req.payload.count({
      collection: 'shorts',
      locale: 'es',
      where: {
        id: { not_equals: shortId },
        or: [{ slug: { equals: slug } }, { previousSlugs: { in: [slug] } }],
      },
      req,
    })
    if (taken.totalDocs === 0) return slug
  }
}

/**
 * Gives the shorts whose title the catalog pass cleaned a slug made from it (`la-veterana`
 * instead of `la-veterana-eac-escuelaandinadecinematografia`). The old slug is kept in
 * `previousSlugs` (see Shorts.ts) and redirects. Only touches slugs that differ from the
 * title's, so running it again does nothing.
 */
export async function regenerateSlugs(req: PayloadRequest): Promise<{ changed: number }> {
  const shorts = await req.payload.find({
    collection: 'shorts',
    locale: 'es',
    where: { 'aiReview.model': { equals: PASS_MODEL } },
    select: { title: true, slug: true },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  let changed = 0
  for (const short of shorts.docs) {
    const base = slugify(short.title)
    if (!base || short.slug === base || short.slug.replace(/-\d+$/, '') === base) continue
    const slug = await freeSlug(req, base, short.id)
    await req.payload.update({
      collection: 'shorts',
      id: short.id,
      locale: 'es',
      data: { slug },
      req,
    })
    changed++
  }
  return { changed }
}

/** Queued once by a migration, after the catalog pass; safe to run again. */
export const regenerateSlugsTask: TaskConfig<{
  input: Record<string, never>
  output: { changed: number }
}> = {
  slug: 'regenerateSlugs',
  label: 'Regenerate slugs from the cleaned titles',
  retries: 1,
  outputSchema: [{ name: 'changed', type: 'number', required: true }],
  handler: async ({ req }) => {
    const output = await regenerateSlugs(req)
    req.payload.logger.info(`regenerateSlugs: ${output.changed} slugs changed`)
    return { output }
  },
}
