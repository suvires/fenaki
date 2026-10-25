import type { Locale } from '@fenaki/i18n'
import { ShortGrid } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import {
  readList,
  subscribe,
  withCurrent,
  type CurrentShorts,
  type ListedShort,
} from '../lib/myList.ts'

interface MyListGridProps {
  emptyHint: string
  locale: Locale
  /** The path of a short's page up to the slug. */
  hrefBase: string
  /** The published shorts' current card data: saved items show it, and unpublished ones drop out. */
  current: CurrentShorts
}

/** Every short the viewer saved, newest first. The hint is on the server render until storage is read. */
export function MyListGrid({ emptyHint, locale, hrefBase, current }: MyListGridProps) {
  const [items, setItems] = useState<ListedShort[]>([])

  useEffect(() => {
    const sync = () => setItems(withCurrent(readList(), current))
    sync()
    return subscribe(sync)
  }, [current])

  if (items.length === 0) return <p className="m-0 text-body-l text-ink-muted">{emptyHint}</p>
  return (
    <ShortGrid
      items={items.map((item) => ({
        title: item.title,
        director: item.director,
        year: item.year,
        seconds: item.seconds,
        locale,
        tone: item.tone,
        image: item.image,
        synopsis: item.synopsis,
        badges: item.badges,
        slug: item.slug,
        typeLabel: item.typeLabel,
        href: `${hrefBase}${item.slug}`,
      }))}
    />
  )
}
