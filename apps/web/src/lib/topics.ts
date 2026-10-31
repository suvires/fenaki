/** The theme pages (/es/temas/<slug>): one per catalog theme, with a localized slug and text. */
import type { Locale, MessageKey } from '@fenaki/i18n'
import type { TopicTone } from '@fenaki/ui'
import { THEMES, type Theme } from './browse.ts'
import { paths, translator } from './i18n.ts'

export { THEMES, type Theme }

const text = (locale: Locale, theme: Theme, field: 'slug' | 'title' | 'intro') =>
  translator(locale)(`topics.pages.${theme}.${field}` as MessageKey)

export const topicSlug = (locale: Locale, theme: Theme) => text(locale, theme, 'slug')

export const topicHref = (locale: Locale, theme: Theme) =>
  paths.topic(locale, topicSlug(locale, theme))

/** The theme a page's slug names, if any. */
export const topicFromSlug = (locale: Locale, slug: string | undefined): Theme | undefined =>
  THEMES.find((theme) => topicSlug(locale, theme) === slug)

/** Its `<title>` («Cortos sobre familia») and its introduction, written for search engines. */
export const topicText = (locale: Locale, theme: Theme) => ({
  title: text(locale, theme, 'title'),
  intro: text(locale, theme, 'intro'),
})

const TOPIC_TONES: TopicTone[] = ['tungsteno', 'sala', 'plata']

/** Each theme's poster tone, the same on every page; in THEMES order the tones alternate. */
export const topicTone = (theme: Theme): TopicTone =>
  TOPIC_TONES[THEMES.indexOf(theme) % TOPIC_TONES.length] ?? 'sala'
