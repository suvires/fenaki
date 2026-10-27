import type { Fetch } from '../oembed.ts'
import { parseChannelUrl } from './url.ts'
import { feedChannelName, fetchVimeoFeed } from './vimeo.ts'
import { lookupYouTubeChannel } from './youtube.ts'

export interface ResolvedChannel {
  provider: 'youtube' | 'vimeo'
  /** YouTube: the `UC…` channel id. Vimeo: the path of the feed (`user` or `channels/slug`). */
  externalId: string
  name: string
}

export type ResolveFailure = 'invalid-url' | 'no-api-key' | 'not-found'

/**
 * Finds the provider's own id for a channel URL, and its name. Throws when the provider cannot be
 * asked; a result with `failure` means the URL does not name a channel we can scan.
 */
export async function resolveChannel(
  url: string,
  keys: { youtube?: string },
  fetchFn: Fetch = fetch,
): Promise<ResolvedChannel | { failure: ResolveFailure }> {
  const ref = parseChannelUrl(url)
  if (!ref) return { failure: 'invalid-url' }
  if (ref.provider === 'youtube') {
    if (!keys.youtube) return { failure: 'no-api-key' }
    const channel = await lookupYouTubeChannel(ref, keys.youtube, fetchFn)
    if (!channel) return { failure: 'not-found' }
    return { provider: 'youtube', externalId: channel.id, name: channel.name }
  }
  let feed
  try {
    feed = await fetchVimeoFeed(ref.path, fetchFn)
  } catch (error) {
    // A 404 is a missing user; anything else is Vimeo failing.
    if (/HTTP 404/.test((error as Error).message)) return { failure: 'not-found' }
    throw error
  }
  return {
    provider: 'vimeo',
    externalId: ref.path,
    name: feedChannelName(feed.title) || ref.path.replace(/^channels\//, ''),
  }
}
