import type { Endpoint, PayloadRequest, Where } from 'payload'

/**
 * What a short is compared on: its directors, the channel it came from, genres, themes, type,
 * audience, length, country and year.
 */
export interface RelatedFacts {
  id: number
  directors: number[]
  channel: number | null
  genres: string[]
  themes: string[]
  allAudiences: boolean
  type: string | null
  seconds: number | null
  country: string | null
  year: number | null
}

/**
 * How much each shared trait counts. The same director outweighs everything else; then the same
 * channel (a festival, school or maker), then each genre and theme in common, the kind of film
 * and its length. A short for all audiences leans to others that are too, and its neighbours
 * that are not lose points: whoever watches with children sees more of the same.
 */
export const WEIGHTS = {
  director: 100,
  channel: 40,
  genre: 30,
  theme: 15,
  type: 20,
  audience: 25,
  length: 10,
  country: 5,
  decade: 5,
} as const

/** Lengths count as alike within this share of the longer one. */
const LENGTH_TOLERANCE = 0.3
/** Candidates fetched per trait before scoring. */
const POOL = 60

/** A stable shuffle per page: among equal scores, each short shows different neighbours. */
function tieBreak(base: number, id: number) {
  return Math.imul(base ^ 0x9e3779b9, id ^ 0x85ebca6b) >>> 0
}

export function relatedScore(base: RelatedFacts, other: RelatedFacts) {
  let score = 0
  if (other.directors.some((person) => base.directors.includes(person))) score += WEIGHTS.director
  if (base.channel !== null && other.channel === base.channel) score += WEIGHTS.channel
  score += WEIGHTS.genre * other.genres.filter((genre) => base.genres.includes(genre)).length
  score += WEIGHTS.theme * other.themes.filter((theme) => base.themes.includes(theme)).length
  if (base.allAudiences) score += other.allAudiences ? WEIGHTS.audience : -WEIGHTS.audience
  if (base.type && other.type === base.type) score += WEIGHTS.type
  if (base.seconds && other.seconds) {
    const longer = Math.max(base.seconds, other.seconds)
    if (Math.abs(base.seconds - other.seconds) <= longer * LENGTH_TOLERANCE) score += WEIGHTS.length
  }
  if (base.country && other.country === base.country) score += WEIGHTS.country
  if (base.year && other.year && Math.floor(base.year / 10) === Math.floor(other.year / 10))
    score += WEIGHTS.decade
  return score
}

/** The candidates' ids, best match first, without the short itself. */
export function rankRelated(base: RelatedFacts, candidates: RelatedFacts[], limit: number) {
  const seen = new Set<number>([base.id])
  return candidates
    .filter((candidate) => !seen.has(candidate.id) && seen.add(candidate.id))
    .map((candidate) => ({ id: candidate.id, score: relatedScore(base, candidate) }))
    .sort((a, b) => b.score - a.score || tieBreak(base.id, a.id) - tieBreak(base.id, b.id))
    .slice(0, limit)
    .map((candidate) => candidate.id)
}

type ShortDoc = {
  id: number
  credits?: { role?: string | null; person?: number | { id: number } | null }[] | null
  ingestChannel?: number | { id: number } | null
  genres?: string[] | null
  themes?: string[] | null
  allAudiences?: boolean | null
  type?: string | null
  durationSeconds?: number | null
  country?: string | null
  year?: number | null
}

const idOf = (value: number | { id: number } | null | undefined) =>
  typeof value === 'object' && value !== null ? value.id : (value ?? null)

export function factsOf(short: ShortDoc): RelatedFacts {
  return {
    id: short.id,
    directors: (short.credits ?? [])
      .filter((credit) => credit.role === 'director')
      .map((credit) => idOf(credit.person))
      .filter((id): id is number => id !== null),
    channel: idOf(short.ingestChannel),
    genres: short.genres ?? [],
    themes: short.themes ?? [],
    allAudiences: Boolean(short.allAudiences),
    type: short.type ?? null,
    seconds: short.durationSeconds ?? null,
    country: short.country ?? null,
    year: short.year ?? null,
  }
}

const SELECT = {
  credits: true,
  ingestChannel: true,
  genres: true,
  themes: true,
  allAudiences: true,
  type: true,
  durationSeconds: true,
  country: true,
  year: true,
} as const

/**
 * The published shorts most like this one: candidates sharing a director, the channel, a genre,
 * a theme, or the type and length, scored by what they share.
 */
export async function relatedShortIds(req: PayloadRequest, id: number, limit: number) {
  const short = await req.payload
    .findByID({ collection: 'shorts', id, depth: 0, select: SELECT, req })
    .catch(() => null)
  if (!short) return undefined
  const base = factsOf(short as ShortDoc)
  const published: Where = { status: { equals: 'published' }, id: { not_equals: id } }
  const traits: Where[] = []
  if (base.directors.length > 0) traits.push({ 'credits.person': { in: base.directors } })
  if (base.channel !== null) traits.push({ ingestChannel: { equals: base.channel } })
  if (base.genres.length > 0) traits.push({ genres: { in: base.genres } })
  if (base.themes.length > 0) traits.push({ themes: { in: base.themes } })
  if (base.type) {
    const near: Where = { type: { equals: base.type } }
    if (base.seconds)
      Object.assign(near, {
        durationSeconds: {
          greater_than_equal: Math.floor(base.seconds * (1 - LENGTH_TOLERANCE)),
          less_than_equal: Math.ceil(base.seconds / (1 - LENGTH_TOLERANCE)),
        },
      })
    traits.push(near)
  }
  const pools = await Promise.all(
    traits.map((trait) =>
      req.payload.find({
        collection: 'shorts',
        where: { and: [published, trait] },
        select: SELECT,
        depth: 0,
        limit: POOL,
        sort: '-publishedAt',
        req,
      }),
    ),
  )
  const candidates = pools.flatMap((pool) => pool.docs as ShortDoc[]).map(factsOf)
  return rankRelated(base, candidates, limit)
}

/** GET /api/shorts/:id/related?limit=12: the ids of the published shorts most like this one. */
export const relatedShortsEndpoint: Endpoint = {
  path: '/:id/related',
  method: 'get',
  handler: async (req) => {
    const id = Number(req.routeParams?.id)
    const asked = Number(new URL(req.url ?? '', 'http://cms').searchParams.get('limit'))
    const limit = Number.isInteger(asked) && asked > 0 ? Math.min(asked, 24) : 12
    if (!Number.isInteger(id)) return Response.json({ error: 'Not found' }, { status: 404 })
    const ids = await relatedShortIds(req, id, limit)
    if (!ids) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ ids }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
  },
}
