import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

/**
 * The legal pages, one Markdown file per locale: packages/i18n/legal/<locale>/<slug>.md. The title
 * and the date of the last update are in the frontmatter: the page header shows them.
 */
const legal = defineCollection({
  loader: glob({ pattern: '*/*.md', base: '../../packages/i18n/legal' }),
  schema: z.object({ title: z.string(), updated: z.coerce.date().optional() }),
})

export const collections = { legal }
