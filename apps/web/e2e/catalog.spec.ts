import { expect, test } from '@playwright/test'

test('the browse page filters by facets with shareable URLs', async ({ page }) => {
  await page.goto('/es/cortos')
  await expect(page.getByRole('heading', { level: 1, name: 'Todos los cortos' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('6 cortos')

  const duration = page.getByRole('region', { name: 'Duración' })
  await duration.getByRole('link', { name: /Más de 15 min/ }).click()
  await expect(page).toHaveURL(/\/es\/cortos\?duration=long$/)
  await expect(page.getByRole('status')).toHaveText('2 cortos con estos filtros')
  await expect(page.getByRole('link', { name: /Madre/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Cuerdas/ })).toHaveCount(0)
  // Filtered pages are not indexed; the unfiltered page is the canonical one.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')

  // A shared URL opens the same selection; the selected option clears it.
  await page.goto('/es/cortos?duration=long&form=live-action')
  await expect(page.getByRole('status')).toHaveText('2 cortos con estos filtros')
  await page
    .getByRole('region', { name: 'Forma' })
    .getByRole('link', { name: /Imagen real/ })
    .click()
  await expect(page).toHaveURL(/\/es\/cortos\?duration=long$/)
})

test('credits link to person pages with their shorts', async ({ page }) => {
  await page.goto('/es/cortos/timecode')
  await page.getByRole('link', { name: 'Juanjo Giménez' }).click()
  await expect(page).toHaveURL(/\/es\/personas\/juanjo-gimenez$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Juanjo Giménez' })).toBeVisible()
  await expect(page.getByText('Dirección', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Timecode/ })).toBeVisible()
  expect((await page.request.get('/es/personas/nadie')).status()).toBe(404)
})

test('a showcase shows the organization, its selection and the presenter', async ({ page }) => {
  await page.goto('/es/escaparates/escuela-de-cine-de-ejemplo')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Escuela de Cine de Ejemplo' }),
  ).toBeVisible()
  await expect(page.getByText('Escaparate · Escuela de cine')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Escuela de Cine de Ejemplo' })).toBeVisible()
  await expect(page.getByText('Presentado por')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Su selección · 3 cortos' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Alike/ })).toBeVisible()

  // The presenter never follows the shorts to their pages, near the player.
  await page.getByRole('link', { name: /Alike/ }).click()
  await expect(page.getByRole('button', { name: 'Ver ahora' })).toBeVisible()
  await expect(page.getByText('Presentado por')).toHaveCount(0)
})

test('short pages carry structured data, canonical URLs and a generated OG image', async ({
  page,
  request,
}) => {
  await page.goto('/es/cortos/timecode')
  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
  ) as Record<string, unknown>
  expect(data).toMatchObject({ '@type': 'VideoObject', name: 'Timecode', duration: 'PT15M' })
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/es\/cortos\/timecode$/,
  )
  await expect(page.locator('link[hreflang="x-default"]')).toHaveCount(1)
  const image = await page.locator('meta[property="og:image"]').getAttribute('content')
  expect(image).toMatch(/\/og\/es\/cortos\/timecode\.png$/)
  const png = await request.get(new URL(image ?? '').pathname)
  expect(png.status()).toBe(200)
  expect(png.headers()['content-type']).toBe('image/png')

  const sitemap = await (await request.get('/sitemap-es.xml')).text()
  expect(sitemap).toContain('/es/cortos/timecode</loc>')
  expect(sitemap).toContain('/es/personas/juanjo-gimenez</loc>')
  expect(sitemap).toContain('/es/escaparates/escuela-de-cine-de-ejemplo</loc>')
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: ')
})

test('the sponsorship page has no contact links without a mailbox', async ({ page }) => {
  await page.goto('/es/patrocina')
  await expect(page.getByRole('heading', { level: 1, name: 'Patrocina Fenaki' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Colección patrocinada' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Escaparate', exact: true })).toBeVisible()
  await expect(page.getByText('350 € + IVA')).toBeVisible()
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
  await expect(page.getByText('Muy pronto tendrás aquí una dirección de contacto.')).toBeVisible()
})

test('a short added to «Mi lista» appears in the rail and the list page, and survives a reload', async ({
  page,
}) => {
  await page.goto('/es/')
  const rail = page.getByRole('region', { name: 'Mi lista' })
  await expect(rail.getByText(/Guarda cortos con/)).toBeVisible()

  const hero = page.locator('section').first()
  await hero.getByRole('button', { name: 'Añadir a mi lista' }).click()
  const saved = hero.getByRole('button', { name: 'En mi lista' })
  await expect(saved).toHaveAttribute('aria-pressed', 'true')
  await expect(rail.getByRole('link')).toHaveCount(2) // the title link and one card
  const title = (await page.getByRole('heading', { level: 1 }).first().innerText()).trim()

  await page.reload()
  await expect(
    page.locator('section').first().getByRole('button', { name: 'En mi lista' }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: 'Mi lista' }).getByRole('link')).toHaveCount(2)

  // The header link and the rail title lead to the page with the whole list.
  await page
    .getByRole('region', { name: 'Mi lista' })
    .getByRole('link', { name: /Mi lista/ })
    .click()
  await expect(page).toHaveURL(/\/es\/mi-lista$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Mi lista' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  await expect(page.getByRole('link', { name: new RegExp(title, 'i') })).toBeVisible()

  // Removing it from the home hero empties the rail again.
  await page.goto('/es/')
  await page.locator('section').first().getByRole('button', { name: 'En mi lista' }).click()
  await expect(
    page.getByRole('region', { name: 'Mi lista' }).getByText(/Guarda cortos con/),
  ).toBeVisible()
})
