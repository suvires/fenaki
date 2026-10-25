import type { Locale } from '@fenaki/i18n'
import { Rail, ShortCard } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { readList, subscribe, type SavedShort } from '../lib/myList.ts'

interface MyListRailProps {
  title: string
  /** «Ver todo» */
  actionLabel: string
  /** The page with the whole list. */
  actionHref: string
  /** Shown while the list is empty. */
  emptyHint: string
  locale: Locale
  /** The path of a short's page, already built by the server for this slug pattern. */
  hrefBase: string
}

/**
 * The viewer's saved shorts. The title and the hint are rendered on the server and the cards
 * replace the hint after storage is read, so the page does not jump for an empty list.
 */
export function MyListRail({
  title,
  actionLabel,
  actionHref,
  emptyHint,
  locale,
  hrefBase,
}: MyListRailProps) {
  const [items, setItems] = useState<SavedShort[]>([])

  useEffect(() => {
    const sync = () => setItems(readList())
    sync()
    return subscribe(sync)
  }, [])

  return (
    <Rail title={title} actionLabel={actionLabel} actionHref={actionHref}>
      {items.length === 0 ? (
        <p className="m-0 text-body text-ink-muted">{emptyHint}</p>
      ) : (
        items.map((item) => (
          <ShortCard
            key={item.slug}
            title={item.title}
            director={item.director}
            year={item.year}
            seconds={item.seconds}
            locale={locale}
            tone={item.tone}
            image={item.image}
            href={`${hrefBase}${item.slug}`}
          />
        ))
      )}
    </Rail>
  )
}
