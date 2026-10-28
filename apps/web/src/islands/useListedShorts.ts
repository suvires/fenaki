import { useEffect, useMemo, useState } from 'react'
import {
  fetchCurrent,
  withCurrent,
  type CurrentShorts,
  type ListedShort,
  type SavedShort,
} from '../lib/myList.ts'

/**
 * The saved shorts an island shows, with the catalog's current data. The server's lookup is the
 * starting point (`seed`, for the `seeded` slugs it looked up); any other short shown is asked
 * for once, as the list or the page changes. Until then it shows what was stored.
 */
export function useListedShorts(
  locale: string,
  saved: SavedShort[],
  seed: CurrentShorts,
  seeded: string[],
): ListedShort[] {
  const [current, setCurrent] = useState(seed)
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set(seeded))
  const missing = saved.map((item) => item.slug).filter((slug) => !checked.has(slug))
  const key = missing.join(',')

  useEffect(() => {
    if (key === '') return
    const slugs = key.split(',')
    let live = true
    fetchCurrent(locale, slugs)
      .then((found) => {
        if (!live) return
        setCurrent((before) => ({ ...before, ...found }))
        setChecked((before) => new Set([...before, ...slugs]))
      })
      // The catalog did not answer: what was stored stays on show.
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [key, locale])

  return useMemo(() => withCurrent(saved, current, checked), [saved, current, checked])
}
