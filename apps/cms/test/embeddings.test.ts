import { afterEach, describe, expect, it } from 'vitest'
import {
  contentHash,
  embed,
  embeddingText,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from '../src/related/embeddings.ts'

describe('embeddingText', () => {
  it('reads the title, the original one when it differs, the kind of film and the synopsis', () => {
    expect(
      embeddingText({
        id: 1,
        title: 'La casa',
        originalTitle: 'The House',
        type: 'fiction',
        genres: ['drama'],
        themes: ['family'],
        synopsis: ' Una familia vuelve al pueblo. ',
      }),
    ).toBe('La casa\nThe House\nFicción, Drama, Familia\nUna familia vuelve al pueblo.')
    expect(embeddingText({ id: 2, title: 'Loop', originalTitle: 'Loop' })).toBe('Loop')
  })
})

describe('contentHash', () => {
  it('changes with the text only', () => {
    expect(contentHash('a')).toBe(contentHash('a'))
    expect(contentHash('a')).not.toBe(contentHash('b'))
  })
})

describe('embed', () => {
  const key = process.env.VOYAGE_API_KEY
  afterEach(() => {
    process.env.VOYAGE_API_KEY = key
  })

  it('asks Voyage AI for document embeddings, and returns them in the order of the texts', async () => {
    process.env.VOYAGE_API_KEY = 'test-key'
    let sent: { url: string; init: RequestInit } | undefined
    const fakeVoyage = (async (url: string, init: RequestInit) => {
      sent = { url, init }
      return Response.json({
        data: [
          { index: 1, embedding: [0, 1] },
          { index: 0, embedding: [1, 0] },
        ],
      })
    }) as unknown as typeof fetch
    expect(await embed(['uno', 'dos'], fakeVoyage)).toEqual([
      [1, 0],
      [0, 1],
    ])
    expect(sent?.url).toBe('https://api.voyageai.com/v1/embeddings')
    expect(new Headers(sent?.init.headers).get('authorization')).toBe('Bearer test-key')
    expect(JSON.parse(String(sent?.init.body))).toEqual({
      input: ['uno', 'dos'],
      model: EMBEDDING_MODEL,
      input_type: 'document',
      output_dimension: EMBEDDING_DIMENSIONS,
    })
  })

  it('fails on an error from the API, so the job retries', async () => {
    const failing = (async () =>
      new Response('rate limited', { status: 429 })) as unknown as typeof fetch
    await expect(embed(['uno'], failing)).rejects.toThrow(/429/)
  })
})
