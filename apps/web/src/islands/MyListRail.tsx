import type { Locale } from '@fenaki/i18n'
import { Rail, ShortCard } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import {
  readList,
  subscribe,
  withCurrent,
  type CurrentShorts,
  type ListedShort,
} from '../lib/myList.ts'

interface MyListRailProps {
  title: string
  /** «Ver todo» */
  actionLabel: string
  /** The page with the whole list. */
  actionHref: string
  locale: Locale
  /** The path of a short's page, already built by the server for this slug pattern. */
  hrefBase: string
  /** The published shorts' current card data: saved items show it, and unpublished ones drop out. */
  current: CurrentShorts
}

/**
 * The viewer's saved shorts. Nothing at all while the list is empty, so the server renders
 * nothing and the rail appears once storage is read and has something in it.
 */
export function MyListRail({
  title,
  actionLabel,
  actionHref,
  locale,
  hrefBase,
  current,
}: MyListRailProps) {
  const [items, setItems] = useState<ListedShort[]>([])

  useEffect(() => {
    const sync = () => setItems(withCurrent(readList(), current))
    sync()
    return subscribe(sync)
  }, [current])

  if (items.length === 0) return null
  return (
    <Rail title={title} actionLabel={actionLabel} actionHref={actionHref}>
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
