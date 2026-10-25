import type { Fetch } from './oembed.ts'

/** A film on The Movie Database. Needs TMDB_API_KEY (a v3 key or a v4 read token). */
export interface TmdbFilm {
  id: number
  title: string
  year: number | null
  /** ISO 3166-1 alpha-2. */
  country: string | null
  originalLanguage: string | null
  runtimeSeconds: number | null
}

function request(path: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`https://api.themoviedb.org/3/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const headers: Record<string, string> = { Accept: 'application/json' }
  // v4 read access tokens are JWTs; v3 keys go in the query string.
  if (apiKey.startsWith('eyJ')) headers.Authorization = `Bearer ${apiKey}`
  else url.searchParams.set('api_key', apiKey)
  return { url, headers }
}

interface SearchResult {
  id: number
  title?: string
  original_title?: string
  release_date?: string
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** The search result that is this film: same title, and the same year when both are known. */
export function bestMatch(
  results: SearchResult[],
  title: string,
  year?: number | null,
): SearchResult | undefined {
  const wanted = normalize(title)
  return results.find((result) => {
    const titles = [result.title, result.original_title]
      .filter((t): t is string => Boolean(t))
      .map(normalize)
    if (!titles.includes(wanted)) return false
    const resultYear = result.release_date ? Number(result.release_date.slice(0, 4)) : null
    return !year || !resultYear || Math.abs(resultYear - year) <= 1
  })
}

/** Finds a film by title (and year), or undefined. Errors count as not found: TMDB is optional. */
export async function lookupTmdb(
  title: string,
  year: number | null | undefined,
  apiKey: string,
  fetchFn: Fetch = fetch,
): Promise<TmdbFilm | undefined> {
  try {
    const search = request('search/movie', { query: title, language: 'es-ES' }, apiKey)
    const found = await fetchFn(search.url, {
      headers: search.headers,
      signal: AbortSignal.timeout(10_000),
    })
    if (!found.ok) return undefined
    const match = bestMatch(
      ((await found.json()) as { results?: SearchResult[] }).results ?? [],
      title,
      year,
    )
    if (!match) return undefined
    const details = request(`movie/${match.id}`, { language: 'es-ES' }, apiKey)
    const response = await fetchFn(details.url, {
      headers: details.headers,
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return undefined
    const film = (await response.json()) as {
      id: number
      title?: string
      release_date?: string
      runtime?: number
      original_language?: string
      production_countries?: { iso_3166_1?: string }[]
    }
    return {
      id: film.id,
      title: film.title ?? title,
      year: film.release_date ? Number(film.release_date.slice(0, 4)) || null : null,
      country: film.production_countries?.[0]?.iso_3166_1 ?? null,
      originalLanguage: film.original_language || null,
      runtimeSeconds: film.runtime ? film.runtime * 60 : null,
    }
  } catch {
    return undefined
  }
}
