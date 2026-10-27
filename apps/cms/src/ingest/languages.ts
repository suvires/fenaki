import type { YouTubeVideo } from './youtube.ts'

/** ISO 639-2 «no linguistic content»: the value for a short without dialogue. */
export const NO_DIALOGUE = 'zxx'

/** Where a language value came from. An editor's value is never replaced by the other two. */
export const LANGUAGE_SOURCES = ['provider', 'channel', 'ai', 'editor'] as const
export type LanguageSource = (typeof LANGUAGE_SOURCES)[number]

/** The catalog is Spanish today; the setting (`catalog-settings`) adds more later. */
export const DEFAULT_CATALOG_LANGUAGES = ['es']

/**
 * What is known about the languages of a video. Subtitles split by kind: a human track is a
 * translator's work, an automatic one is the provider's speech recognition.
 */
export interface LanguageInfo {
  /** ISO 639-1 codes, or `zxx` for no dialogue. Empty when nobody said. */
  spoken: string[]
  /** Human subtitle languages. */
  subtitles: string[]
  /** Automatic subtitle languages. */
  autoSubtitles: string[]
  /** The provider says some caption track exists, without saying in which language (YouTube). */
  hasCaptions: boolean | null
  source: LanguageSource | null
}

export const noLanguages = (): LanguageInfo => ({
  spoken: [],
  subtitles: [],
  autoSubtitles: [],
  hasCaptions: null,
  source: null,
})

/** BCP 47 code («es-419») as its primary language («es»); `zxx` and `und` keep their meaning. */
export const primaryLanguage = (code: string | null | undefined): string | null => {
  const primary = code?.split(/[-_]/)[0]?.trim().toLowerCase()
  return primary || null
}

const unique = (codes: (string | null | undefined)[]) => [
  ...new Set(codes.map(primaryLanguage).filter((code): code is string => Boolean(code))),
]

export const languageList = (codes: (string | null | undefined)[]) => unique(codes)

/**
 * Uses the channel's default language when the provider did not say what is spoken. It stays
 * marked as coming from the channel, so a later pass can tell it from a provider value.
 */
export function withDefaultLanguage(info: LanguageInfo, fallback: string | null | undefined) {
  const code = primaryLanguage(fallback)
  if (info.spoken.length > 0 || !code) return info
  return { ...info, spoken: [code], source: 'channel' as const }
}

/**
 * Whether the video is in a catalog language: spoken in one, without dialogue, or spoken in
 * another with subtitles in one. When nobody said what is spoken it passes (the review decides),
 * and so does a foreign video the provider says has captions without saying in which language.
 */
export function inCatalogLanguage(info: LanguageInfo, catalog: string[]): boolean {
  if (info.spoken.length === 0) return true
  if (info.spoken.includes(NO_DIALOGUE)) return true
  if (info.spoken.some((code) => catalog.includes(code))) return true
  const subtitled = [...info.subtitles, ...info.autoSubtitles].some((code) =>
    catalog.includes(primaryLanguage(code) ?? ''),
  )
  if (subtitled) return true
  return info.hasCaptions === true && info.subtitles.length === 0 && info.autoSubtitles.length === 0
}

/** The short's `originalLanguage`, `otherLanguages` and `noDialogue` from the spoken languages. */
export function shortLanguageFields(spoken: string[]) {
  const silent = spoken.length === 1 && spoken[0] === NO_DIALOGUE
  return {
    originalLanguage: spoken[0] ?? null,
    otherLanguages: spoken.slice(1),
    noDialogue: silent,
  }
}

/**
 * What the YouTube Data API says: the audio language the uploader set, else the language of the
 * title and description (a weaker hint). Caption languages are not in `videos.list`.
 */
export function youtubeLanguages(video: YouTubeVideo): LanguageInfo {
  const spoken = unique([video.audioLanguage ?? video.defaultLanguage])
  return {
    spoken,
    subtitles: [],
    autoSubtitles: [],
    hasCaptions: video.hasCaptions,
    source: spoken.length > 0 ? 'provider' : null,
  }
}

/** `captions` select value for a source or ledger row. Null when the provider did not say. */
export const captionsValue = (hasCaptions: boolean | null): 'yes' | 'no' | null =>
  hasCaptions === null ? null : hasCaptions ? 'yes' : 'no'
