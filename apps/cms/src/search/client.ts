import { Meilisearch } from 'meilisearch'

let client: Meilisearch | undefined

export function searchClient(): Meilisearch {
  client ??= new Meilisearch({
    host: process.env.MEILISEARCH_HOST ?? 'http://127.0.0.1:7700',
    apiKey: process.env.MEILISEARCH_ADMIN_KEY,
  })
  return client
}
