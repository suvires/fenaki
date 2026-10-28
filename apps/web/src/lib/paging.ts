import type { Translate } from '@fenaki/i18n'
import type { PaginationProps } from '@fenaki/ui'

/**
 * Pages of a list kept by the viewer («Mi lista», the history): 20 shorts a page, the page in the
 * URL (`?page=2`) so every page has its own address.
 */

/** Shorts per page: five rows of four on a wide screen. */
export const PAGE_SIZE = 20

/** The page in a URL. Anything that is not a whole number from 2 up is the first page. */
export function parsePage(params: URLSearchParams): number {
  const page = Number(params.get('page'))
  return Number.isInteger(page) && page > 1 && page < 1000 ? page : 1
}

/** The address of a page: the first one has no parameter. */
export function pageHref(base: string, page: number): string {
  return page > 1 ? `${base}?page=${page}` : base
}

/** How many pages a list of this length fills; an empty list still has one. */
export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

/** The items of one page; past the last page, the last one. */
export function pageOf<T>(items: T[], page: number): { items: T[]; page: number; pages: number } {
  const pages = pageCount(items.length)
  const current = Math.min(page, pages)
  return {
    items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    page: current,
    pages,
  }
}

/** The texts and addresses of the pager under a list. */
export function paginationProps(
  t: Translate,
  page: number,
  pages: number,
  href: (page: number) => string,
): PaginationProps {
  return {
    label: t('browse.pagination.label'),
    page,
    pages,
    href,
    previousLabel: t('browse.pagination.previous'),
    nextLabel: t('browse.pagination.next'),
    pageLabel: (n) => t('browse.pagination.page', { page: n }),
  }
}
