import type { Translate } from '@fenaki/i18n'

export type ContactTopic = 'propose' | 'sponsor' | 'showcase'
export type ContactLinks = Record<ContactTopic, { href: string; label: string }>

/**
 * Mail links to the contact mailbox, one subject per topic, or nothing while there is no
 * mailbox: the site never links to an address that does not receive mail.
 */
export function contactLinks(email: string | undefined, t: Translate): ContactLinks | undefined {
  if (!email) return undefined
  const link = (topic: ContactTopic) => ({
    href: `mailto:${email}?subject=${encodeURIComponent(t(`contact.${topic}.subject`))}`,
    label: t(`contact.${topic}.label`),
  })
  return { propose: link('propose'), sponsor: link('sponsor'), showcase: link('showcase') }
}
