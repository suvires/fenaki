import { Button } from '../atoms/Button.tsx'
import { IconButton } from '../atoms/IconButton.tsx'
import { cx } from '../foundations/cx.ts'
import { FacetGroup, type FacetOption } from '../molecules/FacetGroup.tsx'
import { FilterMenu, FilterOptions, menuButtonClass } from '../molecules/FilterMenu.tsx'

export interface FilterBarGroup {
  /** The URL parameter: anchors the menu and the sheet section. */
  key: string
  label: string
  options: FacetOption[]
}

export interface FilterBarProps {
  /** Names the bar for screen readers: «Filtros». */
  label: string
  /** The filters with a menu of their own, in order. */
  groups: FilterBarGroup[]
  /** The rest, in one «Más filtros» menu: on/off filters first, then the lists. */
  more: { label: string; toggles: FilterBarGroup; groups: FilterBarGroup[] }
  /** The order of the results: `label` names the list («Orden»), `name` is its button («Orden: Últimos añadidos»). */
  sort: { label: string; name: string; options: FacetOption[] }
  /** The sheet that holds every filter on small screens. */
  sheet: {
    /** «Filtros», on the button that opens it. */
    button: string
    title: string
    /** How many values are chosen, on the button. */
    selected: number
    /** The current page, without the sheet: «Ver 120 cortos». */
    results: { label: string; href: string }
    closeLabel: string
  }
  countLabel?: (count: number) => string
  className?: string
}

const MENU = 'filtro-'
/** The sheet and its sections (`filtros-genre`): a link back to one opens the sheet on it. */
const SHEET = 'filtros'

/** Each option links back to the menu or section it is in, so the next page opens it again. */
const anchored = (options: FacetOption[], anchor: string) =>
  options.map((option) => ({ ...option, href: `${option.href}#${anchor}` }))

const chosen = (options: FacetOption[]) => options.filter((option) => option.selected).length

/**
 * The browse page's filters. On wide screens, a row of dropdowns (FilterMenu) and the order on
 * the right; on small screens, one «Filtros» button opening a full-screen sheet with every
 * filter, and the order. Every option is a link, so each combination has its own URL and it all
 * works without JavaScript; the page script reopens the menu a link came from and closes menus
 * on Escape or a click outside (`data-filter-menu`, `data-filter-close`).
 */
export function FilterBar({
  label,
  groups,
  more,
  sort,
  sheet,
  countLabel,
  className,
}: FilterBarProps) {
  const moreGroups = [more.toggles, ...more.groups]
  const moreSelected = moreGroups.reduce((sum, group) => sum + chosen(group.options), 0)
  return (
    <nav aria-label={label} className={cx('flex items-start gap-2', className)}>
      <details id={SHEET} data-filter-menu="" className="md:hidden">
        <summary className={menuButtonClass(sheet.selected)}>
          <span>{sheet.button}</span>
          {sheet.selected > 0 ? (
            <span className="font-mono text-label-s">{sheet.selected}</span>
          ) : null}
        </summary>
        <div
          role="dialog"
          aria-label={sheet.title}
          className="fixed inset-0 z-(--filter-sheet-layer) flex flex-col bg-canvas"
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-subtle">
            <h2 className="m-0 text-title">{sheet.title}</h2>
            <IconButton
              icon="close"
              label={sheet.closeLabel}
              variant="ghost"
              href={sheet.results.href}
              data-filter-close=""
            />
          </div>
          <div className="flex-1 overflow-y-auto grid content-start gap-6 p-4">
            {[...groups, ...moreGroups].map((group) => (
              <FacetGroup
                key={group.key}
                id={`${SHEET}-${group.key}`}
                label={group.label}
                options={anchored(group.options, `${SHEET}-${group.key}`)}
                countLabel={countLabel}
              />
            ))}
          </div>
          <div className="p-4 border-t border-subtle">
            <Button href={sheet.results.href} data-filter-close="" className="w-full">
              {sheet.results.label}
            </Button>
          </div>
        </div>
      </details>
      <div className="hidden md:flex flex-wrap gap-2">
        {groups.map((group) =>
          group.options.some((option) => option.selected || option.count !== 0) ? (
            <FilterMenu
              key={group.key}
              id={`${MENU}${group.key}`}
              label={group.label}
              selected={chosen(group.options)}
            >
              <FilterOptions
                label={group.label}
                options={anchored(group.options, `${MENU}${group.key}`)}
                countLabel={countLabel}
              />
            </FilterMenu>
          ) : null,
        )}
        <FilterMenu id={`${MENU}more`} label={more.label} selected={moreSelected}>
          <div className="grid gap-2">
            {moreGroups.map((group) => (
              <FilterOptions
                key={group.key}
                label={group.label}
                heading={group !== more.toggles}
                options={anchored(group.options, `${MENU}more`)}
                countLabel={countLabel}
              />
            ))}
          </div>
        </FilterMenu>
      </div>
      <FilterMenu id={`${MENU}sort`} label={sort.name} align="end" className="ml-auto">
        {/* Not anchored: choosing an order closes the menu. */}
        <FilterOptions label={sort.label} options={sort.options} />
      </FilterMenu>
    </nav>
  )
}
