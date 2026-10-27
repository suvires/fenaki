import {
  DEFAULT_CATALOG_LANGUAGES,
  inCatalogLanguage,
  noLanguages,
  type LanguageInfo,
} from '../languages.ts'

/** Why the scanner leaves a video out of the review queue. */
export const SKIP_REASONS = [
  'duplicate',
  'private',
  'not-embeddable',
  'age-restricted',
  'unavailable',
  'unknown-duration',
  'too-short',
  'too-long',
  'not-a-short',
  'not-in-catalog-language',
] as const
export type SkipReason = (typeof SKIP_REASONS)[number]

/** What the rules need to know about a video. */
export interface Candidate {
  title: string
  durationSeconds: number | null
  embeddable: boolean
  ageRestricted: boolean
  status: 'ok' | 'broken' | 'private'
  /** What is known about the spoken language and subtitles; unknown when left out. */
  languages?: LanguageInfo
}

export interface DurationFilter {
  minSeconds: number
  maxSeconds: number
}

/** Lowercase and without accents, so «Tráiler» and «trailer» are the same word. */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Things channels publish besides their shorts. Whole words only: «Clipper» is a title. */
const NON_SHORT_TITLE =
  /\b(trailer|teaser|making[\s-]?of|detras de las camaras|behind the scenes|clip|avance|entrevista|interview|gala|rueda de prensa)\b/

export const looksLikeNonShort = (title: string): boolean => NON_SHORT_TITLE.test(fold(title))

/** The first rule a video breaks, or undefined when it goes to the review queue. */
export function skipReason(
  candidate: Candidate,
  filter: DurationFilter,
  catalogLanguages: string[] = DEFAULT_CATALOG_LANGUAGES,
): SkipReason | undefined {
  if (candidate.status === 'broken') return 'unavailable'
  if (candidate.status === 'private') return 'private'
  if (!candidate.embeddable) return 'not-embeddable'
  if (candidate.ageRestricted) return 'age-restricted'
  if (candidate.durationSeconds === null) return 'unknown-duration'
  if (candidate.durationSeconds < filter.minSeconds) return 'too-short'
  if (candidate.durationSeconds > filter.maxSeconds) return 'too-long'
  if (looksLikeNonShort(candidate.title)) return 'not-a-short'
  if (!inCatalogLanguage(candidate.languages ?? noLanguages(), catalogLanguages))
    return 'not-in-catalog-language'
  return undefined
}
