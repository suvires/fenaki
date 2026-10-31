import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * The launch collections' descriptions, 31 Oct 2026: generic, saying what each collection gathers
 * (its filters), instead of naming particular countries, works or filmmakers that its rules do not
 * promise. Matched by slug; only a description still holding the launch text changes.
 */
const DESCRIPTIONS: { slug: string; from: string; to: string }[] = [
  {
    slug: 'premiados-de-los-goya-al-oscar',
    from: 'Goyas, nominaciones al Óscar y hasta un récord Guinness.',
    to: 'Cortos premiados, nominados o preseleccionados en festivales y galas de cine.',
  },
  {
    slug: 'memorias-documental-y-vida-real',
    from: 'Familia, duelo y memoria histórica contados en primera persona.',
    to: 'Documentales sobre memoria e historia.',
  },
  {
    slug: 'cortos-latinoamericanos',
    from: 'Cortos de México, Argentina, Colombia, Chile, Perú, Uruguay',
    to: 'Cortos hechos en Latinoamérica.',
  },
]

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  for (const { slug, from, to } of DESCRIPTIONS) {
    const found = await payload.find({
      collection: 'collections',
      where: { slug: { equals: slug } },
      locale: 'es',
      depth: 0,
      limit: 1,
      req,
    })
    const collection = found.docs[0]
    if (!collection?.description?.startsWith(from)) continue
    await payload.update({
      collection: 'collections',
      id: collection.id,
      locale: 'es',
      data: { description: to },
      req,
    })
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
