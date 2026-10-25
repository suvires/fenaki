/** Routes that only exist once the catalog is public. No Astro imports, so tests can use it. */
const CATALOG_ROUTES = [
  /^\/[a-z]{2}\/cortos(\/|$)/,
  /^\/[a-z]{2}\/colecciones(\/|$)/,
  /^\/[a-z]{2}\/personas(\/|$)/,
  /^\/[a-z]{2}\/escaparates(\/|$)/,
  /^\/[a-z]{2}\/buscar\/?$/,
  /^\/api\/search\/?$/,
]

export type SiteMode = 'landing' | 'catalog'

/** In `landing` mode the catalog routes answer 404 and /es/ is the pre-launch landing page. */
export function isHiddenInMode(pathname: string, mode: SiteMode): boolean {
  return mode === 'landing' && CATALOG_ROUTES.some((route) => route.test(pathname))
}
