import type { HiddenReason } from '../collections/Shorts.ts'
import type { OEmbedResult } from './oembed.ts'
import type { YouTubeVideo } from './youtube.ts'

/** What a check found out about a source, in the shape of its fields. */
export interface Assessment {
  /** False when the provider could not be asked: nothing is changed or hidden. */
  conclusive: boolean
  status: 'ok' | 'broken' | 'private'
  embeddable: boolean
  ageRestricted: boolean
  note: string
}

/**
 * Combines the oEmbed answer with the YouTube Data API's, when there is a key. `api` is
 * undefined without a key, and null when the API does not return the video (deleted or private).
 */
export function assess(oembed: OEmbedResult, api?: YouTubeVideo | null): Assessment {
  const base = { conclusive: true, status: 'ok' as const, embeddable: true, ageRestricted: false }
  if (api !== undefined) {
    if (api === null || api.privacyStatus === 'private')
      return {
        ...base,
        status: oembed.kind === 'missing' ? 'broken' : 'private',
        note:
          api === null
            ? 'The YouTube Data API does not return the video: deleted or private.'
            : 'The video is private.',
      }
    const problems = [
      !api.embeddable && 'embedding is disabled',
      api.ageRestricted && 'the video is age restricted',
    ].filter(Boolean)
    return {
      ...base,
      embeddable: api.embeddable,
      ageRestricted: api.ageRestricted,
      note:
        problems.length > 0 ? `YouTube Data API: ${problems.join(', ')}.` : 'YouTube Data API: OK.',
    }
  }
  switch (oembed.kind) {
    case 'ok':
      return { ...base, note: 'oEmbed: OK.' }
    case 'not-embeddable':
      return {
        ...base,
        embeddable: false,
        note: `oEmbed: embedding is disabled (HTTP ${oembed.httpStatus}).`,
      }
    case 'private':
      return {
        ...base,
        status: 'private',
        note: `oEmbed: the video is private (HTTP ${oembed.httpStatus}).`,
      }
    case 'missing':
      return {
        ...base,
        status: 'broken',
        note: `oEmbed: the video does not exist (HTTP ${oembed.httpStatus}).`,
      }
    case 'error':
      return { ...base, conclusive: false, note: `Inconclusive: ${oembed.message}` }
  }
}

/** Why a source cannot play, or undefined when it can. */
export function unplayableReason(assessment: Assessment): HiddenReason | undefined {
  if (!assessment.conclusive) return undefined
  if (assessment.status === 'broken') return 'broken'
  if (assessment.status === 'private') return 'private'
  if (!assessment.embeddable) return 'not-embeddable'
  if (assessment.ageRestricted) return 'age-restricted'
  return undefined
}
