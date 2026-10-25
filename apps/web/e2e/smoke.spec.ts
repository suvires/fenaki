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
  ]) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe(type)
  }
})

test('the home page shows the sponsored collection and the rails', async ({ page }) => {
  await page.goto('/es/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Imprescindibles del corto español' }),
  ).toBeVisible()
  await expect(page.getByText('Presentada por')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Novedades' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Timecode/ }).first()).toBeVisible()
  // No launch date in the tests: nothing is «Nuevo» before the launch.
  await expect(page.getByText('Nuevo', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Más de 15 min' }).click()
  const latest = page.getByRole('region', { name: 'Novedades' })
  await expect(latest.getByRole('link', { name: /Madre/ })).toBeVisible()
  await expect(latest.getByRole('link', { name: /Cuerdas/ })).toBeHidden()
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
  await page.goto('/es/buscar')
  await page.getByRole('searchbox', { name: 'Buscar cortos' }).fill('vigalondo')
  await expect(page.getByText('1 corto encontrado')).toBeVisible()
  await expect(page.getByRole('link', { name: /7:35 de la mañana/ })).toBeVisible()
  await expect(page).toHaveURL(/\/es\/buscar\?q=vigalondo$/)
})
