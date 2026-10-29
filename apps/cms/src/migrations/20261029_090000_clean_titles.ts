import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { slugify } from '../fields/slug.ts'
import { freeSlug } from '../jobs/regenerateSlugs.ts'
import data from './data/20261029_titles.json' with { type: 'json' }

/**
 * The title pass of 29 oct 2026, reviewed one by one by Claude Code over every published short:
 * missing accents, shouted capitals, repeated signs and the festival, school or course names the
 * uploads carried. A short whose slug came from its old title gets one from the new title (the
 * old slug redirects, see Shorts.ts). Search and «Si te ha gustado» are refreshed by the Shorts
 * hooks. Only shorts still holding the reviewed title change, so an editor's title is kept; running it
 * again only fixes slugs.
 */
export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  for (const { id, from, to: title } of data.titles) {
    const current = await payload.findByID({
      collection: 'shorts',
      id,
      locale: 'es',
      depth: 0,
      disableErrors: true,
      req,
    })
    if (!current || (current.title !== from && current.title !== title)) continue
    const old = slugify(from)
    const fromTitle = current.slug === old || new RegExp(`^${old}-\\d+$`).test(current.slug)
    const base = slugify(title)
    const slug =
      fromTitle && base && current.slug.replace(/-\d+$/, '') !== base
        ? await freeSlug(req, base, current.id)
        : current.slug
    if (current.title === title && current.slug === slug) continue
    await payload.update({
      collection: 'shorts',
      id: current.id,
      locale: 'es',
      data: { title, slug },
      req,
    })
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
