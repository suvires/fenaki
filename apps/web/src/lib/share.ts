import type { ShareTarget } from '@fenaki/ui'

/** The networks and messaging apps a page can be shared to, each with its own share link. */
const NETWORKS = [
  {
    key: 'whatsapp',
    link: (url: string, text: string) => `https://wa.me/?text=${enc(`${text} ${url}`)}`,
  },
  {
    key: 'telegram',
    link: (url: string, text: string) => `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
  },
  {
    key: 'x',
    link: (url: string, text: string) =>
      `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`,
  },
  {
    key: 'facebook',
    link: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
  },
  {
    key: 'bluesky',
    link: (url: string, text: string) =>
      `https://bsky.app/intent/compose?text=${enc(`${text} ${url}`)}`,
  },
  {
    key: 'threads',
    link: (url: string, text: string) =>
      `https://www.threads.net/intent/post?text=${enc(`${text} ${url}`)}`,
  },
  {
    key: 'linkedin',
    link: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
  },
  {
    key: 'email',
    link: (url: string, text: string) =>
      `mailto:?subject=${enc(text)}&body=${enc(`${text}\n${url}`)}`,
  },
] as const

export type ShareNetwork = (typeof NETWORKS)[number]['key']

const enc = encodeURIComponent

/**
 * The share links for a page: its absolute address and a line of text, a label per network, and
 * the attributes of each link (the analytics event, with the network).
 */
export function shareTargets(
  url: string,
  text: string,
  label: (network: ShareNetwork) => string,
  attributes?: (network: ShareNetwork) => Record<`data-${string}`, string>,
): ShareTarget[] {
  return NETWORKS.map(({ key, link }) => ({
    label: label(key),
    href: link(url, text),
    ...(attributes ? { attributes: attributes(key) } : {}),
  }))
}
