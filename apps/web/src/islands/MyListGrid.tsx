import { createTranslator, type Locale } from '@fenaki/i18n'
import { Pagination, ShortGrid } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { readList, stub, subscribe, type CurrentShorts, type SavedShort } from '../lib/myList.ts'
import { pageHref, pageOf, paginationProps } from '../lib/paging.ts'
import { useListedShorts } from './useListedShorts.ts'

interface MyListGridProps {
  emptyHint: string
  locale: Locale
  /** The path of a short's page up to the slug. */
  hrefBase: string
  /** This page's address, without the page number. */
  pageBase: string
  /** The page asked for in the URL. */
  page: number
  /**
   * Signed in: the account's list as the server read it, rendered right away, and the current card
   * data of the shorts on the requested page. Signed out both are absent: the list appears once
   * this browser's storage is read, and its page's shorts are asked for then.
   */
  initial?: { slug: string; savedAt: number }[]
  current?: CurrentShorts
}

/**
 * The shorts the viewer saved, newest first, 20 a page. The hint is on the server render until
 * storage is read.
 */
export function MyListGrid({
  emptyHint,
  locale,
  hrefBase,
  pageBase,
  page: requested,
  initial,
  current = {},
}: MyListGridProps) {
  const t = createTranslator(locale)
  const [saved, setSaved] = useState<SavedShort[]>(() => (initial ? initial.map(stub) : []))
  useEffect(() => {
    const sync = () => setSaved(readList())
    sync()
    return subscribe(sync)
  }, [])

  const { items: onPage, page, pages } = pageOf(saved, requested)
  const items = useListedShorts(
    locale,
    onPage,
    current,
    initial ? pageOf(initial, requested).items.map((entry) => entry.slug) : [],
  )

  if (saved.length === 0) return <p className="m-0 text-body-l text-secondary">{emptyHint}</p>
  return (
    <div className="grid gap-8">
      <ShortGrid
        items={items.map((item) => ({
          title: item.title,
          director: item.director,
          year: item.year,
          seconds: item.seconds,
          locale,
          tone: item.tone,
          image: item.image,
          imageTextColor: item.imageTextColor,
          imageHasTitle: item.imageHasTitle,
          synopsis: item.synopsis,
          badges: item.badges,
          slug: item.slug,
          typeLabel: item.typeLabel,
          href: `${hrefBase}${item.slug}`,
        }))}
      />
      {pages > 1 ? (
        <Pagination {...paginationProps(t, page, pages, (n) => pageHref(pageBase, n))} />
      ) : null}
    </div>
  )
}
