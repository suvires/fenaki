import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

/** The legal pages, one Markdown file per locale: packages/i18n/legal/<locale>/<slug>.md. */
const legal = defineCollection({
  loader: glob({ pattern: '*/*.md', base: '../../packages/i18n/legal' }),
})

export const collections = { legal }
