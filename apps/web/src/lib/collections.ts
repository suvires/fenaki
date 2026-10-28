/**
 * The two kinds of collection, as the site shows them: FENAKI's own (by filters, resolved by the
 * CMS, or chosen by hand) and the sponsored ones (always by hand, with their sponsor). They share
 * their address, `/es/colecciones/<slug>`, and the home page's rails and featured hero.
 */
import type { Collection, Sponsor, SponsoredCollection } from '@fenaki/cms/types'
import type { Locale } from '@fenaki/i18n'
import type { CardSource } from './catalog.ts'
import {
  collectionShortIds,
  getCollection,
  getSponsoredCollection,
  listCollections,
  listSponsoredCollections,
  shortsOf,
  sponsorOf,
  toCardSource,
} from './cms.ts'
import { cardsByIds } from './search.ts'

export type ShortCollection =
  { kind: 'own'; doc: Collection } | { kind: 'sponsored'; doc: SponsoredCollection }

/** How many shorts a rail shows when the collection says nothing. */
const RAIL_SIZE = 12

export const railSizeOf = (collection: ShortCollection) =>
  collection.kind === 'own' ? (collection.doc.railSize ?? RAIL_SIZE) : RAIL_SIZE

/** The sponsor while the sponsorship lasts: sponsored collections only. */
export const activeSponsorOf = (
  collection: ShortCollection,
  now = new Date(),
): Sponsor | undefined =>
  collection.kind === 'sponsored' ? sponsorOf(collection.doc, now) : undefined

/** A page of a collection's shorts as cards, and how many it has. */
export async function collectionCards(
  locale: Locale,
  collection: ShortCollection,
  offset: number,
  limit: number,
): Promise<{ cards: CardSource[]; total: number }> {
  if (collection.kind === 'own' && collection.doc.mode !== 'manual') {
    const { ids, total } = await collectionShortIds(locale, collection.doc.id, offset, limit)
    return { cards: await cardsByIds(locale, ids), total }
  }
  const all = shortsOf(collection.doc).map(toCardSource)
  return { cards: all.slice(offset, offset + limit), total: all.length }
}

/** The collection at this address, of either kind. */
export async function findCollection(
  locale: Locale,
  slug: string,
): Promise<ShortCollection | undefined> {
  const [own, sponsored] = await Promise.all([
    getCollection(locale, slug),
    getSponsoredCollection(locale, slug),
  ])
  if (sponsored) return { kind: 'sponsored', doc: sponsored }
  if (own) return { kind: 'own', doc: own }
  return undefined
}

export interface HomeCollection {
  collection: ShortCollection
  cards: CardSource[]
}

/**
 * The home page's collections: the featured one (a sponsored collection marked featured while its
 * sponsorship lasts; else FENAKI's featured one; else the first with shorts) and the rails of the
 * rest. A collection with no short to show is left out.
 */
export async function homeCollections(
  locale: Locale,
  now = new Date(),
): Promise<{ featured?: HomeCollection; rails: HomeCollection[] }> {
  const [own, sponsored] = await Promise.all([
    listCollections(locale),
    listSponsoredCollections(locale),
  ])
  const all: ShortCollection[] = [
    ...sponsored.map((doc) => ({ kind: 'sponsored' as const, doc })),
    ...own.map((doc) => ({ kind: 'own' as const, doc })),
  ]
  const withCards = (
    await Promise.all(
      all.map(async (collection) => ({
        collection,
        cards: (
          await collectionCards(locale, collection, 0, railSizeOf(collection)).catch(() => ({
            cards: [],
          }))
        ).cards,
      })),
    )
  ).filter((entry) => entry.cards.length > 0)
  const featured =
    withCards.find(
      (e) =>
        e.collection.kind === 'sponsored' &&
        e.collection.doc.featured &&
        activeSponsorOf(e.collection, now),
    ) ??
    withCards.find((e) => e.collection.kind === 'own' && e.collection.doc.featured) ??
    withCards[0]
  return { featured, rails: withCards.filter((entry) => entry !== featured) }
}
