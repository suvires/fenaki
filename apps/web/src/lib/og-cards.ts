/** What each page's Open Graph image says. Read from the CMS, rendered by lib/og.ts. */
import { formatDuration, formatList, formatYear, type Locale } from '@fenaki/i18n'
import { CREDIT_ROLES, posterTone } from './catalog.ts'
import {
  getCollection,
  getPerson,
  getShort,
  getShowcase,
  listShortsByPerson,
  peopleOf,
  rolesOf,
  shortsOf,
  sponsorOf,
} from './cms.ts'
import { translator } from './i18n.ts'
import type { OgCard } from './og.ts'

export type OgKind = 'cortos' | 'personas' | 'colecciones' | 'escaparates'
export type OgPage = 'site' | 'browse' | 'sponsor'

function base(locale: Locale) {
  const t = translator(locale)
  return { t, siteName: t('site.name'), tagline: t('site.tagline') }
}

export function pageCard(locale: Locale, page: OgPage): OgCard {
  const { t, siteName, tagline } = base(locale)
  switch (page) {
    case 'browse':
      return { eyebrow: t('seo.ogBrowse'), title: t('browse.title'), siteName, tagline }
    case 'sponsor':
      return {
        eyebrow: t('sponsor.eyebrow'),
        title: t('sponsor.title'),
        subtitle: t('sponsor.offersTitle'),
        siteName,
        tagline,
        tone: 'telon',
      }
    default:
      return {
        eyebrow: t('site.domain'),
        title: t('site.tagline'),
        subtitle: t('seo.ogHome'),
        siteName,
        tagline: '',
        home: true,
      }
  }
}

export async function documentCard(
  locale: Locale,
  kind: OgKind,
  slug: string,
): Promise<OgCard | undefined> {
  const { t, siteName, tagline } = base(locale)
  if (kind === 'cortos') {
    const short = await getShort(locale, slug)
    if (!short) return undefined
    const directors = peopleOf(short, 'director')
    return {
      eyebrow: t('seo.ogShort', { duration: formatDuration(short.durationSeconds, locale) }),
      title: short.title,
      subtitle: [
        directors.length ? formatList(directors, locale) : '',
        short.year ? formatYear(short.year, locale) : '',
      ]
        .filter(Boolean)
        .join(' · '),
      siteName,
      tagline,
      tone: posterTone(short.posterTone),
    }
  }
  if (kind === 'personas') {
    const person = await getPerson(slug)
    const shorts = person ? await listShortsByPerson(locale, person.id) : []
    if (!person || shorts.length === 0) return undefined
    const roles = new Set(shorts.flatMap((short) => rolesOf(short, person.id)))
    return {
      eyebrow: CREDIT_ROLES.filter((role) => roles.has(role))
        .map((role) => t(`short.roles.${role}`))
        .join(' · '),
      title: person.name,
      subtitle: t('person.shorts', { count: shorts.length }),
      siteName,
      tagline,
    }
  }
  if (kind === 'colecciones') {
    const collection = await getCollection(locale, slug)
    if (!collection) return undefined
    return {
      eyebrow: t('collection.eyebrow', { count: shortsOf(collection).length }),
      title: collection.title,
      siteName,
      tagline,
      tone: sponsorOf(collection) ? 'telon' : 'sala',
    }
  }
  const showcase = await getShowcase(locale, slug)
  if (!showcase) return undefined
  return {
    eyebrow: t('showcase.eyebrow', { kind: t(`showcase.kinds.${showcase.kind}`) }),
    title: showcase.name,
    subtitle: t('showcase.selection', { count: shortsOf(showcase).length }),
    siteName,
    tagline,
    tone: showcase.presentedBy ? 'telon' : 'sala',
  }
}
