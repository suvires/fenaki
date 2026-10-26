import { expect, test } from '@playwright/test'

const THIRD_PARTY_PLAYERS = /youtube|ytimg|vimeo|googlevideo/

test('the root redirects to the Spanish home page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/es\/$/)
})

test('every page links the site icon, and it is served', async ({ page, request }) => {
  await page.goto('/es/')
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    'href',
    '/favicon.svg',
  )
  for (const [path, type] of [
    ['/favicon.svg', 'image/svg+xml'],
    ['/favicon.ico', 'image/png'],
    ['/apple-touch-icon.png', 'image/png'],
  ] as const) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe(type)
  }
})

test('the home page shows the latest short, the sponsored collection and the rails', async ({
  page,
}) => {
  await page.goto('/es/')
  // The latest short opens the page; the collection follows.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Ver ahora' })).toHaveAttribute(
    'href',
    /\/es\/cortos\//,
  )
  await expect(
    page.getByRole('heading', { level: 2, name: 'Imprescindibles del corto español' }),
  ).toBeVisible()
  await expect(page.getByText('Presentada por')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Novedades' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Timecode/ }).first()).toBeVisible()
  // No launch date in the tests: nothing is «Nuevo» before the launch.
  await expect(page.getByText('Nuevo', { exact: true })).toHaveCount(0)
})

test('a short page loads no third-party player before the click', async ({ page }) => {
  const playerRequests: string[] = []
  page.on('request', (request) => {
    if (THIRD_PARTY_PLAYERS.test(new URL(request.url()).hostname))
      playerRequests.push(request.url())
  })

  await page.goto('/es/cortos/timecode')
  await expect(page.getByRole('heading', { level: 1, name: 'Timecode' })).toBeAttached()
  await expect(page.getByText('Este corto se reproduce desde YouTube.')).toBeVisible()
  await expect(page.getByText('Embed oficial')).toBeVisible()
  await expect(page.getByText('Dirigido por Juanjo Giménez')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Si te ha gustado' })).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)

  await page.getByRole('button', { name: 'Ver ahora' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Este es un corto de ejemplo: no tiene un reproductor real.',
  )
  expect(playerRequests).toEqual([])
})

test('search finds shorts by director as you type', async ({ page }) => {
  // The search island must be hydrated before typing, or the keystrokes are lost.
  await page.goto('/es/buscar', { waitUntil: 'networkidle' })
  await page.getByRole('searchbox', { name: 'Buscar cortos' }).fill('vigalondo')
  // The first search after the servers start can be slow (cold routes): allow it more time.
  await expect(page.getByText('1 corto encontrado')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: /7:35 de la mañana/ })).toBeVisible()
  await expect(page).toHaveURL(/\/es\/buscar\?q=vigalondo$/)
})

test('the header opens the genres and the search in place', async ({ page }) => {
  await page.goto('/es/')
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await nav.getByRole('button', { name: 'Géneros' }).click()
  await nav.getByRole('link', { name: 'Animación' }).click()
  await expect(page).toHaveURL(/\/es\/cortos\?type=animation$/)

  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const search = page.getByRole('searchbox', { name: 'Buscar cortos' })
  await expect(search).toBeFocused()
  await search.fill('algo')
  await page.getByRole('button', { name: 'Borrar búsqueda' }).click()
  await expect(search).toHaveValue('')
  await expect(search).toBeFocused()
  // Empty, a click outside folds it back.
  await page.getByRole('heading', { level: 2 }).first().click()
  await expect(search).toBeHidden()

  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await search.fill('vigalondo')
  await search.press('Enter')
  await expect(page).toHaveURL(/\/es\/buscar\?q=vigalondo$/)
})
