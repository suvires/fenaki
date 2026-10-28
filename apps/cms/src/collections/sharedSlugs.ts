import { ValidationError, type CollectionBeforeValidateHook, type CollectionSlug } from 'payload'
import { inLanguage, messages } from '../labels.ts'

/**
 * FENAKI's collections and the sponsored ones share their address (`/es/colecciones/<slug>`): a
 * slug taken by the other collection is refused, in the locale being saved.
 */
export function slugFreeAcross(other: CollectionSlug): CollectionBeforeValidateHook {
  return async ({ data, req }) => {
    const slug = typeof data?.slug === 'string' ? data.slug : undefined
    if (!slug) return data
    const taken = await req.payload.count({
      collection: other,
      where: { slug: { equals: slug } },
      locale: req.locale === 'all' ? undefined : (req.locale ?? undefined),
      req,
    })
    if (taken.totalDocs > 0)
      throw new ValidationError({
        errors: [
          { path: 'slug', message: inLanguage(messages.slugTakenByCollection, req.i18n?.language) },
        ],
      })
    return data
  }
}
