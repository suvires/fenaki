import type { Locale } from '@fenaki/i18n'
import { Rail, ShortCard } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { readList, stub, subscribe, type CurrentShorts, type SavedShort } from '../lib/myList.ts'
import { PAGE_SIZE } from '../lib/paging.ts'
import { useListedShorts } from './useListedShorts.ts'

interface MyListRailProps {
  title: string
  /** «Ver todo» */
  actionLabel: string
  /** The page with the whole list. */
  actionHref: string
  /** The slider arrows' names. */
  arrows: { previous: string; next: string }
  locale: Locale
  /** The path of a short's page, already built by the server for this slug pattern. */
  hrefBase: string
  /**
   * Signed in: the current card data of the account's first 20 shorts, as the server read them.
   * Signed out it is empty: the rail asks for its shorts once storage is read.
   */
  current: CurrentShorts
  /**
   * Signed in: the account's list as the server read it, rendered right away. Signed out it is
   * absent and the list appears once this browser's storage is read.
   */
  initial?: { slug: string; savedAt: number }[]
}

/**
 * The viewer's 20 latest saved shorts. Nothing at all while the list is empty, so the server renders
 * nothing and the rail appears once storage is read and has something in it.
 */
export function MyListRail({
  title,
  actionLabel,
  actionHref,
  arrows,
  locale,
  hrefBase,
  current,
  initial,
}: MyListRailProps) {
  const [saved, setSaved] = useState<SavedShort[]>(() => (initial ? initial.map(stub) : []))
  useEffect(() => {
    const sync = () => setSaved(readList())
    sync()
    return subscribe(sync)
  }, [])
  const items = useListedShorts(
    locale,
    saved.slice(0, PAGE_SIZE),
    current,
    initial ? initial.slice(0, PAGE_SIZE).map((entry) => entry.slug) : [],
  )

  if (items.length === 0) return null
  return (
    <Rail title={title} actionLabel={actionLabel} actionHref={actionHref} arrows={arrows}>
      {items.map((item) => (
        <ShortCard
          key={item.slug}
          title={item.title}
          director={item.director}
          year={item.year}
          seconds={item.seconds}
          locale={locale}
          tone={item.tone}
          image={item.image}
          imageTextColor={item.imageTextColor}
          imageHasTitle={item.imageHasTitle}
          synopsis={item.synopsis}
          badges={item.badges}
          slug={item.slug}
          typeLabel={item.typeLabel}
          href={`${hrefBase}${item.slug}`}
        />
      ))}
    </Rail>
  )
}
