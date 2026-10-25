import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { cx } from '../cx.ts'
import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'
import { SearchField } from './SearchField.tsx'
import { Wordmark } from './Wordmark.tsx'

interface Link {
  label: string
  href: string
}

export interface SiteHeaderProps {
  /** The logo's link and accessible name. */
  home: { href: string; label: string }
  /** Accessible name of the main navigation. */
  navLabel: string
  /** «Géneros»: a disclosure with one link per type. */
  genres: { label: string; items: Link[] }
  /** Plain links after the genres, such as «Novedades» and «Mi lista». */
  links: Link[]
  /** The search form the magnifier opens in the header. */
  search: {
    action: string
    name: string
    label: string
    placeholder: string
    /** Accessible name of the magnifier button. */
    toggleLabel: string
  }
  /** «Iniciar sesión» (a link) and «Crear cuenta» (a primary button). */
  account: { signIn: Link; signUp: Link }
  /** Accessible name of the menu button on small screens. */
  menuLabel: string
  className?: string
}

const linkClass =
  'rounded-xs text-nav text-ink no-underline hover:text-tungsteno-text focus-visible:focus-ring'

/**
 * The site's top bar: logo, main navigation (genres, links), a search that slides open to the left
 * of the magnifier in the same bar, taking the free space without hiding anything, and the account
 * links. Disclosure buttons (aria-expanded), not menu roles: Escape closes what is open.
 * On small screens the navigation and account links fold into a menu; the magnifier stays.
 */
export function SiteHeader({
  home,
  navLabel,
  genres,
  links,
  search,
  account,
  menuLabel,
  className,
}: SiteHeaderProps) {
  const [genresOpen, setGenresOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const genresId = useId()
  const searchId = useId()
  const menuId = useId()
  const searchInput = useRef<HTMLInputElement | null>(null)
  const root = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus()
  }, [searchOpen])

  // A click outside closes the genres list.
  useEffect(() => {
    if (!genresOpen) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setGenresOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [genresOpen])

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    setGenresOpen(false)
    setSearchOpen(false)
    setMenuOpen(false)
  }

  const navigation = (where: 'bar' | 'menu') => (
    <ul className="m-0 p-0 list-none flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
      <li className="relative">
        <button
          type="button"
          aria-expanded={genresOpen}
          aria-controls={`${genresId}-${where}`}
          onClick={() => setGenresOpen((open) => !open)}
          className={cx(
            linkClass,
            'inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer',
          )}
        >
          {genres.label}
          <Icon
            name="chevron"
            size="xs"
            className={cx(
              'transition-transform motion-reduce:transition-none',
              genresOpen ? '-rotate-90' : 'rotate-90',
            )}
          />
        </button>
        <ul
          id={`${genresId}-${where}`}
          hidden={!genresOpen}
          className="m-0 mt-2 p-2 list-none grid gap-1 md:absolute md:left-0 md:top-full md:z-10 md:min-w-(--size-card) rounded-sm bg-sala-1 border border-line shadow-hover"
        >
          {genres.items.map((item) => (
            <li key={item.href}>
              <a href={item.href} className={cx(linkClass, 'block px-2 py-1')}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </li>
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} className={linkClass}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  )

  const accountLinks = (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      <a href={account.signIn.href} className={linkClass}>
        {account.signIn.label}
      </a>
      <Button href={account.signUp.href}>{account.signUp.label}</Button>
    </div>
  )

  return (
    <header ref={root} onKeyDown={onKeyDown} className={cx('grid gap-4', className)}>
      <div className="flex items-center gap-6">
        <a href={home.href} className="inline-flex text-ink rounded-xs focus-visible:focus-ring">
          <Wordmark label={home.label} className="h-6 w-auto" />
        </a>
        <nav aria-label={navLabel} className="hidden md:block md:ml-6 flex-none">
          {navigation('bar')}
        </nav>
        <div className="ml-auto flex flex-1 min-w-0 items-center justify-end gap-4">
          <form
            id={searchId}
            inert={!searchOpen}
            aria-hidden={!searchOpen}
            action={search.action}
            method="get"
            role="search"
            className={cx(
              'w-full overflow-hidden transition-[max-width,opacity] motion-reduce:transition-none',
              searchOpen ? 'max-w-search opacity-100' : 'max-w-0 opacity-0',
            )}
          >
            <SearchField
              ref={searchInput}
              name={search.name}
              id={`${searchId}-field`}
              label={search.label}
              placeholder={search.placeholder}
            />
          </form>
          <button
            type="button"
            aria-expanded={searchOpen}
            aria-controls={searchId}
            aria-label={search.toggleLabel}
            onClick={() => setSearchOpen((open) => !open)}
            className="inline-flex items-center justify-center size-(--size-control-md) rounded-sm bg-transparent border-0 text-ink hover:text-tungsteno-text cursor-pointer focus-visible:focus-ring"
          >
            <Icon name="search" size="xl" />
          </button>
          <div className="hidden md:block">{accountLinks}</div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className={cx(linkClass, 'md:hidden bg-transparent border-0 p-0 cursor-pointer')}
          >
            {menuLabel}
          </button>
        </div>
      </div>
      <div id={menuId} hidden={!menuOpen} className="md:hidden grid gap-6 pb-2">
        <nav aria-label={navLabel}>{navigation('menu')}</nav>
        {accountLinks}
      </div>
    </header>
  )
}
