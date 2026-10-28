/** The AI review of a short: what the model is asked for, and how its answer is read back. */
import { cleanClasses, SHORT_GENRES, SHORT_THEMES } from '../catalog/taxonomy.ts'

export const RECOMMENDATIONS = ['publish', 'discard', 'needs-human'] as const
export type Recommendation = (typeof RECOMMENDATIONS)[number]

export const NOT_COMPLETE_REASONS = [
  'trailer',
  'making-of',
  'episode',
  'ad',
  'gala',
  'clip',
  'interview',
  'compilation',
  'other',
] as const
export const SPOKEN_KINDS = ['es', 'none', 'other'] as const
export const SUBTITLE_ANSWERS = ['yes', 'no', 'unknown'] as const
/** The short types the catalog has («genre» in the brief). */
export const GENRES = ['fiction', 'documentary', 'animation', 'experimental'] as const
export const AWARD_RESULTS = ['won', 'nominated', 'selected', 'shortlisted'] as const
export const TECHNIQUES = ['animation', 'live-action', 'mixed', 'unknown'] as const
export const CREDIT_ROLES = [
  'director',
  'writer',
  'producer',
  'cinematographer',
  'editor',
  'composer',
  'cast',
] as const

export interface ShortReview {
  isCompleteShort: boolean
  notCompleteReason: (typeof NOT_COMPLETE_REASONS)[number] | null
  spokenLanguage: (typeof SPOKEN_KINDS)[number]
  /** ISO 639-1 code when `spokenLanguage` is `other`. */
  spokenLanguageOther: string | null
  spanishSubtitles: (typeof SUBTITLE_ANSWERS)[number]
  title: string | null
  year: number | null
  country: string | null
  credits: { name: string; role: (typeof CREDIT_ROLES)[number] }[]
  genre: (typeof GENRES)[number] | null
  /** Genres in the catalog's sense (drama, horror…), up to two, the main one first. */
  genres: (typeof SHORT_GENRES)[number][]
  themes: (typeof SHORT_THEMES)[number][]
  allAudiences: boolean
  /** The thumbnail shows the film's title (a poster): cards then draw no title over it. */
  titleInThumbnail: boolean
  /** The title in the film's own language, when the one given is a translation. */
  originalTitle: string | null
  /** The production company or school the data names. */
  production: string | null
  /** ISO 639-1 codes of other languages spoken, besides the main one. */
  otherLanguages: string[]
  /** Awards, nominations and festival selections the description states. */
  awards: { name: string; result: (typeof AWARD_RESULTS)[number]; year: number | null }[]
  technique: (typeof TECHNIQUES)[number]
  brandedContent: boolean
  brand: string | null
  restrictions: string | null
  reuploadSigns: string | null
  synopsis: string
  recommendation: Recommendation
  reason: string
}

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] })
const text = { type: 'string' }

/** JSON schema for `output_config.format`: every key required, nothing else allowed. */
export const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'isCompleteShort',
    'notCompleteReason',
    'spokenLanguage',
    'spokenLanguageOther',
    'spanishSubtitles',
    'title',
    'year',
    'country',
    'credits',
    'genre',
    'genres',
    'themes',
    'allAudiences',
    'titleInThumbnail',
    'originalTitle',
    'production',
    'otherLanguages',
    'awards',
    'technique',
    'brandedContent',
    'brand',
    'restrictions',
    'reuploadSigns',
    'synopsis',
    'recommendation',
    'reason',
  ],
  properties: {
    isCompleteShort: { type: 'boolean' },
    notCompleteReason: nullable({ type: 'string', enum: [...NOT_COMPLETE_REASONS] }),
    spokenLanguage: { type: 'string', enum: [...SPOKEN_KINDS] },
    spokenLanguageOther: nullable(text),
    spanishSubtitles: { type: 'string', enum: [...SUBTITLE_ANSWERS] },
    title: nullable(text),
    year: nullable({ type: 'integer' }),
    country: nullable(text),
    credits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'role'],
        properties: { name: text, role: { type: 'string', enum: [...CREDIT_ROLES] } },
      },
    },
    genre: nullable({ type: 'string', enum: [...GENRES] }),
    genres: { type: 'array', items: { type: 'string', enum: [...SHORT_GENRES] } },
    themes: { type: 'array', items: { type: 'string', enum: [...SHORT_THEMES] } },
    allAudiences: { type: 'boolean' },
    titleInThumbnail: { type: 'boolean' },
    originalTitle: nullable(text),
    production: nullable(text),
    otherLanguages: { type: 'array', items: text },
    awards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'result', 'year'],
        properties: {
          name: text,
          result: { type: 'string', enum: [...AWARD_RESULTS] },
          year: nullable({ type: 'integer' }),
        },
      },
    },
    technique: { type: 'string', enum: [...TECHNIQUES] },
    brandedContent: { type: 'boolean' },
    brand: nullable(text),
    restrictions: nullable(text),
    reuploadSigns: nullable(text),
    synopsis: text,
    recommendation: { type: 'string', enum: [...RECOMMENDATIONS] },
    reason: text,
  },
} as const

const isOneOf = <T extends readonly string[]>(values: T, value: unknown): value is T[number] =>
  typeof value === 'string' && (values as readonly string[]).includes(value)
const orNull = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

/**
 * Reads the model's answer. Structured outputs keep it inside the schema, but a response cut off
 * or altered must never reach the database as if it were one: anything else is null.
 */
export function parseReview(raw: string): ShortReview | null {
  let value: Record<string, unknown>
  try {
    value = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  if (
    typeof value.isCompleteShort !== 'boolean' ||
    typeof value.brandedContent !== 'boolean' ||
    typeof value.allAudiences !== 'boolean' ||
    typeof value.titleInThumbnail !== 'boolean' ||
    typeof value.synopsis !== 'string' ||
    typeof value.reason !== 'string' ||
    !isOneOf(SPOKEN_KINDS, value.spokenLanguage) ||
    !isOneOf(SUBTITLE_ANSWERS, value.spanishSubtitles) ||
    !isOneOf(TECHNIQUES, value.technique) ||
    !isOneOf(RECOMMENDATIONS, value.recommendation)
  )
    return null
  const credits = Array.isArray(value.credits)
    ? value.credits.flatMap((credit: Record<string, unknown>) =>
        typeof credit?.name === 'string' && credit.name.trim() && isOneOf(CREDIT_ROLES, credit.role)
          ? [{ name: credit.name.trim(), role: credit.role }]
          : [],
      )
    : []
  const year = typeof value.year === 'number' && Number.isInteger(value.year) ? value.year : null
  return {
    isCompleteShort: value.isCompleteShort,
    notCompleteReason: isOneOf(NOT_COMPLETE_REASONS, value.notCompleteReason)
      ? value.notCompleteReason
      : null,
    spokenLanguage: value.spokenLanguage,
    spokenLanguageOther: orNull(value.spokenLanguageOther)?.toLowerCase() ?? null,
    spanishSubtitles: value.spanishSubtitles,
    title: orNull(value.title),
    year: year !== null && year >= 1888 && year <= 2100 ? year : null,
    country: /^[A-Z]{2}$/.test(String(value.country ?? '')) ? String(value.country) : null,
    credits,
    genre: isOneOf(GENRES, value.genre) ? value.genre : null,
    genres: cleanClasses(SHORT_GENRES, value.genres),
    themes: cleanClasses(SHORT_THEMES, value.themes),
    allAudiences: value.allAudiences,
    titleInThumbnail: value.titleInThumbnail,
    originalTitle: orNull(value.originalTitle),
    production: orNull(value.production)?.slice(0, 200) ?? null,
    otherLanguages: Array.isArray(value.otherLanguages)
      ? [
          ...new Set(
            value.otherLanguages.flatMap((code: unknown) =>
              typeof code === 'string' && /^[a-z]{2,3}$/i.test(code.trim())
                ? [code.trim().toLowerCase()]
                : [],
            ),
          ),
        ]
      : [],
    awards: Array.isArray(value.awards)
      ? value.awards.flatMap((award: Record<string, unknown>) => {
          const name = orNull(award?.name)
          if (!name || !isOneOf(AWARD_RESULTS, award.result)) return []
          const year =
            typeof award.year === 'number' && Number.isInteger(award.year) ? award.year : null
          return [
            {
              name,
              result: award.result,
              year: year && year >= 1888 && year <= 2100 ? year : null,
            },
          ]
        })
      : [],
    technique: value.technique,
    brandedContent: value.brandedContent,
    brand: orNull(value.brand),
    restrictions: orNull(value.restrictions),
    reuploadSigns: orNull(value.reuploadSigns),
    synopsis: value.synopsis.trim(),
    recommendation: value.recommendation,
    reason: value.reason.trim(),
  }
}
