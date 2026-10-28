import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'
import {
  factsOf,
  rankRelated,
  relatedScore,
  relatedShortIds,
  WEIGHTS,
  type RelatedFacts,
} from '../src/related/related.ts'

const facts = (id: number, extra: Partial<RelatedFacts> = {}): RelatedFacts => ({
  id,
  directors: [],
  channel: null,
  genres: [],
  themes: [],
  allAudiences: false,
  type: null,
  seconds: null,
  country: null,
  year: null,
  ...extra,
})

const base = facts(1, {
  directors: [10],
  channel: 5,
  type: 'fiction',
  seconds: 600,
  country: 'ES',
  year: 2014,
})

describe('relatedScore', () => {
  it('adds up what the two shorts share', () => {
    expect(relatedScore(base, facts(2))).toBe(0)
    expect(relatedScore(base, facts(2, { directors: [10, 11] }))).toBe(WEIGHTS.director)
    expect(relatedScore(base, facts(2, { channel: 5, type: 'fiction' }))).toBe(
      WEIGHTS.channel + WEIGHTS.type,
    )
    expect(relatedScore(base, facts(2, { country: 'ES', year: 2019 }))).toBe(
      WEIGHTS.country + WEIGHTS.decade,
    )
  })

  it('counts lengths as alike within 30 %', () => {
    expect(relatedScore(base, facts(2, { seconds: 800 }))).toBe(WEIGHTS.length)
    expect(relatedScore(base, facts(2, { seconds: 1200 }))).toBe(0)
  })

  it('counts each genre and theme in common', () => {
    const horror = { ...base, genres: ['horror', 'thriller'], themes: ['family'] }
    expect(relatedScore(horror, facts(2, { genres: ['thriller', 'horror'] }))).toBe(
      2 * WEIGHTS.genre,
    )
    expect(relatedScore(horror, facts(2, { genres: ['comedy'], themes: ['family'] }))).toBe(
      WEIGHTS.theme,
    )
  })

  it('keeps a short for all audiences among others that are too', () => {
    const forAll = { ...base, allAudiences: true }
    expect(relatedScore(forAll, facts(2, { allAudiences: true }))).toBe(WEIGHTS.audience)
    expect(relatedScore(forAll, facts(2))).toBe(-WEIGHTS.audience)
    // A short for adults does not care.
    expect(relatedScore(base, facts(2, { allAudiences: true }))).toBe(0)
  })

  it('never matches on missing data', () => {
    expect(relatedScore(facts(1), facts(2))).toBe(0)
  })

  it('adds how close the two are in meaning, above what any two shorts share', () => {
    expect(relatedScore(facts(1), facts(2, { similarity: 0.45 }))).toBe(0)
    expect(relatedScore(facts(1), facts(2, { similarity: 0.65 }))).toBeCloseTo(WEIGHTS.meaning / 2)
    expect(relatedScore(facts(1), facts(2, { similarity: 0.95 }))).toBe(WEIGHTS.meaning)
  })
})

describe('rankRelated', () => {
  it('puts the same director first, then the channel, without the short itself or repeats', () => {
    const ranked = rankRelated(
      base,
      [
        facts(2, { type: 'fiction' }),
        facts(3, { channel: 5 }),
        facts(4, { directors: [10] }),
        facts(1, { directors: [10] }),
        facts(3, { channel: 5 }),
      ],
      10,
    )
    expect(ranked).toEqual([4, 3, 2])
  })

  it('orders ties differently for each short, and the same way every time', () => {
    const many = Array.from({ length: 20 }, (_, i) => facts(i + 100))
    const one = rankRelated(facts(1), many, 5)
    expect(rankRelated(facts(1), many, 5)).toEqual(one)
    expect(rankRelated(facts(2), many, 5)).not.toEqual(one)
  })
})

describe('factsOf', () => {
  it('takes only directors from the credits', () => {
    expect(
      factsOf({
        id: 1,
        credits: [
          { role: 'director', person: 10 },
          { role: 'cast', person: 11 },
          { role: 'director', person: { id: 12 } },
        ],
        ingestChannel: { id: 5 },
        type: 'animation',
      }),
    ).toMatchObject({ directors: [10, 12], channel: 5, type: 'animation' })
  })
})

describe('relatedShortIds', () => {
  it('looks for candidates by director, channel and type and length, published only', async () => {
    const wheres: unknown[] = []
    const req = {
      payload: {
        findByID: async () => ({
          id: 1,
          credits: [{ role: 'director', person: 10 }],
          ingestChannel: 5,
          type: 'fiction',
          durationSeconds: 600,
        }),
        find: async ({ where }: { where: unknown }) => {
          wheres.push(where)
          return {
            docs: [
              { id: 2, ingestChannel: 5, type: 'fiction' },
              { id: 3, credits: [{ role: 'director', person: 10 }] },
            ],
          }
        },
      },
    } as unknown as PayloadRequest
    expect(await relatedShortIds(req, 1, 6)).toEqual([3, 2])
    expect(wheres).toHaveLength(3)
    expect(JSON.stringify(wheres)).toContain('"status":{"equals":"published"}')
  })

  it('answers nothing for a short that does not exist', async () => {
    const req = {
      payload: { findByID: async () => Promise.reject(new Error('missing')) },
    } as unknown as PayloadRequest
    expect(await relatedShortIds(req, 99, 6)).toBeUndefined()
  })
})
