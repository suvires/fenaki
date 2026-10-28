import { createTranslator, type Locale } from '@fenaki/i18n'
import { Pagination, SearchField, ShortGrid } from '@fenaki/ui'
import { useEffect, useRef, useState } from 'react'
import { toCard } from '../lib/catalog.ts'
import { paths } from '../lib/i18n.ts'
import { paginationProps } from '../lib/paging.ts'
import type { SearchResult } from '../lib/search.ts'

interface SearchIslandProps {
  locale: Locale
  initial: SearchResult | null
  /** The server could not reach the search engine. */
  initialError: boolean
}

type State = { kind: 'idle' } | { kind: 'results'; result: SearchResult } | { kind: 'error' }

const DEBOUNCE_MS = 150

/**
 * Search as you type: results update without a spinner, and the URL keeps the query. A new query
 * starts on its first page; the pager under the results links to the others (each its own URL).
 */
export function SearchIsland({ locale, initial, initialError }: SearchIslandProps) {
  const t = createTranslator(locale)
  const [query, setQuery] = useState(initial?.query ?? '')
  const [state, setState] = useState<State>(
    initialError
      ? { kind: 'error' }
      : initial
        ? { kind: 'results', result: initial }
        : { kind: 'idle' },
  )
  const controller = useRef<AbortController | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      controller.current?.abort()
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  function search(next: string) {
    setQuery(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const trimmed = next.trim()
      history.replaceState(null, '', paths.search(locale, trimmed))
      controller.current?.abort()
      if (!trimmed) {
        setState({ kind: 'idle' })
        return
      }
      controller.current = new AbortController()
      try {
        const params = new URLSearchParams({ locale, q: trimmed })
        const response = await fetch(`/api/search?${params}`, { signal: controller.current.signal })
        if (!response.ok) throw new Error(String(response.status))
        setState({ kind: 'results', result: (await response.json()) as SearchResult })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setState({ kind: 'error' })
      }
    }, DEBOUNCE_MS)
  }

  const status =
    state.kind === 'error'
      ? t('search.unavailable')
      : state.kind === 'idle'
        ? t('search.prompt')
        : state.result.total === 0
          ? t('search.empty', { query: state.result.query })
          : t('search.results', { count: state.result.total })

  return (
    <div className="grid gap-6">
      <form
        role="search"
        action={paths.search(locale)}
        method="get"
        onSubmit={(e) => e.preventDefault()}
      >
        <SearchField
          id="search-page"
          name="q"
          label={t('search.label')}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(event) => search(event.currentTarget.value)}
          autoComplete="off"
        />
      </form>
      <p role="status" className="m-0 text-body text-secondary">
        {status}
      </p>
      {state.kind === 'results' && state.result.hits.length > 0 ? (
        <ShortGrid
          items={state.result.hits.map((hit) =>
            toCard(hit, locale, t, paths.short(locale, hit.slug)),
          )}
        />
      ) : null}
      {state.kind === 'results' && state.result.pages > 1 ? (
        <Pagination
          {...paginationProps(t, state.result.page, state.result.pages, (n) => {
            const base = paths.search(locale, state.result.query)
            return n > 1 ? `${base}&page=${n}` : base
          })}
        />
      ) : null}
    </div>
  )
}
