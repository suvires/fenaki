import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Two launch collections, 31 Oct 2026. «Nueva generación latinoamericana» becomes «Cortos
 * latinoamericanos»: it is built by region now, not from schools and young producers. «Cortísimos»
 * goes down from 5 to 3 minutes (5 caught too many) with a description that names no one. The
 * slugs follow the titles. Matched by the old slug, so an editor's later changes are kept.
 */
const CHANGES = [
  {
    from: 'nueva-generacion-latinoamericana',
    title: 'Cortos latinoamericanos',
    description:
      'Cortos de México, Argentina, Colombia, Chile, Perú, Uruguay y el resto de Latinoamérica.',
  },
  {
    from: 'cortisimos-menos-de-5-minutos',
    title: 'Cortísimos: menos de 3 minutos',
    description: 'Historias completas en menos de tres minutos.',
    rules: { maxMinutes: 3 },
  },
]

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  for (const change of CHANGES) {
    const found = await payload.find({
      collection: 'collections',
      where: { slug: { equals: change.from } },
      locale: 'es',
      depth: 0,
      limit: 1,
      req,
    })
    const collection = found.docs[0]
    if (!collection) continue
    await payload.update({
      collection: 'collections',
      id: collection.id,
      locale: 'es',
      data: {
        title: change.title,
        slug: '',
        description: change.description,
        ...(change.rules ? { rules: { ...collection.rules, ...change.rules } } : {}),
      },
      req,
    })
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
