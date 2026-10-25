import type { Locale } from '@fenaki/i18n'
import { ShortGrid } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { readList, subscribe, type SavedShort } from '../lib/myList.ts'

interface MyListGridProps {
  emptyHint: string
  locale: Locale
  /** The path of a short's page up to the slug. */
  hrefBase: string
}

/** Every short the viewer saved, newest first. The hint is on the server render until storage is read. */
export function MyListGrid({ emptyHint, locale, hrefBase }: MyListGridProps) {
  const [items, setItems] = useState<SavedShort[]>([])

  useEffect(() => {
    const sync = () => setItems(readList())
    sync()
    return subscribe(sync)
  }, [])

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
        href: `${hrefBase}${item.slug}`,
      }))}
    />
  )
}
