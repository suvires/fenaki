import type { Short } from '@fenaki/cms/types'
import type { PublishedShort } from './cms.ts'

/** The «Lo más visto» rail has exactly this many items, or it is not shown. */
export const TOP_SIZE = 10

const isPublished = (short: number | Short): short is PublishedShort =>
  typeof short === 'object' && short.status === 'published'

/** The ranking global's shorts, most played first, keeping only the published ones, once each. */
export function rankedShorts(ranking: { shorts?: (number | Short)[] | null } | null | undefined) {
  const seen = new Set<number>()
  return (ranking?.shorts ?? []).filter(isPublished).filter((short) => {
    if (seen.has(short.id)) return false
    seen.add(short.id)
    return true
  })
}

/**
 * The shorts of the Top 10 rail: the computed ranking when it has ten, otherwise none. With
 * `preview` (development only) the ten latest published shorts stand in, to design the rail
 * before there are real plays. A ranking is never invented: a short ranking is not shown.
 */
export function topTen({
  ranked,
  latest,
  preview,
}: {
  ranked: PublishedShort[]
  latest: PublishedShort[]
  preview: boolean
}): PublishedShort[] {
  if (ranked.length >= TOP_SIZE) return ranked.slice(0, TOP_SIZE)
  return preview && latest.length >= TOP_SIZE ? latest.slice(0, TOP_SIZE) : []
}

/** The preview flag: on only in development, whatever the environment says in production. */
export const previewEnabled = (flag: boolean, production: boolean) => flag && !production
