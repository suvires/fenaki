import { FilterChips, type FilterChipsProps } from '@fenaki/ui'
import { useState } from 'react'

interface HomeFiltersProps {
  label: string
  options: FilterChipsProps['options']
  noMatchesLabel: string
}

function matches(card: HTMLElement, filter: string | null): boolean {
  if (!filter) return true
  if (filter === 'subtitles') return card.dataset.subtitles === 'yes'
  return card.dataset.band === filter
}

/**
 * Duration and subtitle filters for the home rails. The rails stay static HTML: this island only
 * hides the cards (and then the rails) that do not match.
 */
export function HomeFilters({ label, options, noMatchesLabel }: HomeFiltersProps) {
  const [empty, setEmpty] = useState(false)

  function apply(filter: string | null) {
    let visible = 0
    for (const card of document.querySelectorAll<HTMLElement>('[data-card]')) {
      card.hidden = !matches(card, filter)
      if (!card.hidden) visible += 1
    }
    for (const rail of document.querySelectorAll<HTMLElement>('[data-rail]')) {
      rail.hidden = !rail.querySelector('[data-card]:not([hidden])')
    }
    setEmpty(visible === 0)
  }

  return (
    <div className="grid gap-3">
      <FilterChips label={label} options={options} onChange={apply} />
      <p role="status" className="m-0 text-body text-ink-muted empty:hidden">
        {empty ? noMatchesLabel : ''}
      </p>
    </div>
  )
}
