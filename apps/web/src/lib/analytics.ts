/**
 * Custom events for Umami (cookieless). Umami's tracker sends an event when an element with
 * `data-umami-event` is clicked, with each `data-umami-event-<key>` as event data.
 */
import type { Sponsor } from '@fenaki/cms/types'

export const EVENTS = {
  waitlistSignup: 'waitlist-signup',
  play: 'play',
  sponsorClick: 'sponsor-click',
  share: 'share',
} as const

export function eventAttributes(
  event: (typeof EVENTS)[keyof typeof EVENTS],
  data: Record<string, string> = {},
): Record<`data-${string}`, string> {
  return Object.fromEntries([
    ['data-umami-event', event],
    ...Object.entries(data).map(([key, value]) => [`data-umami-event-${key}`, value]),
  ])
}

/** The sponsor credit of a collection: a link to the sponsor's site, counted as a click event. */
export function sponsorCredit(sponsor: Sponsor, label: string, collection?: string) {
  return {
    label,
    name: sponsor.name,
    href: sponsor.website ?? undefined,
    linkAttributes: sponsor.website
      ? eventAttributes(EVENTS.sponsorClick, {
          sponsor: sponsor.name,
          ...(collection ? { collection } : {}),
        })
      : undefined,
  }
}
