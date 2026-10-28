import { expect, test, type Page } from '@playwright/test'

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
  await expect(page.getByRole('heading', { level: 1, name: 'Patrocina FENAKI' })).toBeVisible()
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
  // Nothing saved yet: no rail at all.
  await expect(rail).toHaveCount(0)

  const hero = page.locator('section').first()
  // The island may not be hydrated yet: click again until the state changes.
  await expect(async () => {
    await hero.getByRole('button', { name: 'Añadir a mi lista' }).click({ timeout: 1000 })
    await expect(hero.getByRole('button', { name: 'En mi lista' })).toBeVisible({ timeout: 1000 })
  }).toPass()
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
  await expect(page.getByRole('heading', { level: 1, name: 'Mi lista' })).toBeAttached()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  await expect(page.getByRole('link', { name: new RegExp(title, 'i') })).toBeVisible()

  // Removing it from the home hero takes the rail away again; the list page shows the hint.
  await page.goto('/es/')
  await page.locator('section').first().getByRole('button', { name: 'En mi lista' }).click()
  await expect(page.getByRole('region', { name: 'Mi lista' })).toHaveCount(0)
  await page.goto('/es/mi-lista')
  await expect(page.getByText(/Todavía no has añadido ningún corto/)).toBeVisible()
})

/** Hovers the first card of the home page and waits for its floating preview. */
async function openPreview(page: Page) {
  await page.goto('/es/')
  const card = page.locator('[data-short-card]').first()
  await card.scrollIntoViewIfNeeded()
  await card.hover()
  const preview = page.locator('[data-short-preview]')
  await expect(preview).toBeVisible()
  return { card, preview }
}

test('hovering a card floats a preview with its actions, and leaving closes it', async ({
  page,
}) => {
  const { card, preview } = await openPreview(page)
  const title = await card.getAttribute('data-title')
  await expect(preview).toHaveAccessibleName(title ?? '')
  await expect(preview.getByRole('link', { name: 'Ver ahora' })).toHaveAttribute(
    'href',
    /\/es\/cortos\//,
  )
  await expect(preview.getByRole('link', { name: 'Más información' })).toBeVisible()
  await expect(preview.getByRole('button', { name: 'Valorar' })).toBeVisible()
  await expect(preview.getByText('Dirigido por')).toBeVisible()
  // Over the card, inside the viewport.
  const box = await preview.boundingBox()
  const viewport = page.viewportSize()
  expect(box && viewport && box.x >= 0 && box.x + box.width <= viewport.width).toBe(true)

  // «Mi lista» from the preview: the rail on the page follows.
  await expect(page.getByRole('region', { name: 'Mi lista' })).toHaveCount(0)
  await preview.getByRole('button', { name: 'Añadir a mi lista' }).click()
  await expect(preview.getByRole('button', { name: 'Quitar de mi lista' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('region', { name: 'Mi lista' })).toBeVisible()

  await page.mouse.move(0, 0)
  await expect(preview).toHaveCount(0)
})

test('the preview closes on Escape', async ({ page }) => {
  const { preview } = await openPreview(page)
  await page.keyboard.press('Escape')
  await expect(preview).toHaveCount(0)
})

test('ratings are chosen from the preview and kept in the browser', async ({ page }) => {
  const { card, preview } = await openPreview(page)
  const slug = (await card.getAttribute('data-short-card')) ?? ''
  const rate = preview.getByRole('button', { name: 'Valorar' })
  const like = preview.getByRole('button', { name: 'Me gusta' })
  // The thumbs-up, outlined (not filled), until the short is rated.
  const fill = () => rate.locator('svg').first().getAttribute('fill')
  expect(await fill()).toBe('none')

  await rate.hover()
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')
  expect(await fill()).toBe('currentColor')
  expect(await page.evaluate(() => localStorage.getItem('fenaki:my-ratings:v1'))).toBe(
    JSON.stringify({ [slug]: 'like' }),
  )

  // Still rated after a reload.
  await page.reload()
  await card.scrollIntoViewIfNeeded()
  await card.hover()
  await expect(preview).toBeVisible()
  await rate.hover()
  await expect(like).toHaveAttribute('aria-pressed', 'true')

  // Choosing it again clears the rating.
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'false')
  expect(await fill()).toBe('none')
  expect(await page.evaluate(() => localStorage.getItem('fenaki:my-ratings:v1'))).toBe('{}')
})

test('the home page has no «Lo más visto» rail until the CMS has a real ranking of ten', async ({
  page,
}) => {
  // The sample seed has six shorts and no plays: a ranking is never invented in production.
  await page.goto('/es/')
  await expect(page.getByRole('region', { name: 'Novedades' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Lo más visto' })).toHaveCount(0)
})

test('«Novedades» in the header and on the home rail lead to a page with one rail per genre', async ({
  page,
}) => {
  await page.goto('/es/')
  await expect(
    page.getByRole('region', { name: 'Novedades' }).getByRole('link', { name: /Novedades/ }),
  ).toHaveAttribute('href', '/es/novedades')
  await page.getByRole('navigation').first().getByRole('link', { name: 'Novedades' }).click()
  await expect(page).toHaveURL(/\/es\/novedades$/)
  // No visible title: the header marks the page instead; the heading is for screen readers.
  await expect(page.getByRole('heading', { level: 1, name: 'Novedades' })).toBeAttached()
  await expect(
    page.getByRole('navigation').first().getByRole('link', { name: 'Novedades' }),
  ).toHaveAttribute('aria-current', 'page')
  // The sample seed has fiction and animation: a rail for each, linking to its genre.
  const animation = page.getByRole('region', { name: 'Animación' })
  await expect(animation).toBeVisible()
  await expect(animation.getByRole('link', { name: /Animación/ }).first()).toHaveAttribute(
    'href',
    '/es/cortos?type=animation',
  )
})

test('rails are sliders: the arrows move the row and show only where it can move', async ({
  page,
}) => {
  await page.goto('/es/')
  const rail = page.getByRole('region', { name: 'Novedades' })
  const next = rail.getByRole('button', { name: 'Siguientes' })
  const previous = rail.getByRole('button', { name: 'Anteriores' })
  const track = rail.locator('[data-rail-track]')
  // Over the rail's title, not a card: a card would open its floating preview over the arrows.
  await rail.getByRole('heading').hover()
  await expect(next).toBeVisible()
  await expect(previous).toBeHidden()

  await next.click()
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  await expect(previous).toBeVisible()
})

test('the account terms are linked from the footer and accepted at sign-up', async ({ page }) => {
  await page.goto('/es/crear-cuenta')
  await page.getByRole('main').getByRole('link', { name: 'términos de uso' }).click()
  await expect(page).toHaveURL(/\/es\/terminos-de-uso$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Términos de uso de las cuentas' }),
  ).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Pie de página' }).getByRole('link', {
      name: 'Términos de uso',
    }),
  ).toHaveAttribute('href', '/es/terminos-de-uso')
})

test('a collection by filters lists the shorts that meet them, on the home page and its own', async ({
  page,
}) => {
  await page.goto('/es/')
  const rail = page.getByRole('region', { name: 'Animación en corto' })
  await expect(rail.getByRole('link', { name: /Cuerdas/ })).toBeVisible()
  await page.goto('/es/colecciones/animacion-en-corto')
  await expect(page.getByRole('heading', { level: 1, name: 'Animación en corto' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Cuerdas/ })).toBeVisible()
  // Only animation: a fiction short of the sample catalog is not in it.
  await expect(page.getByRole('link', { name: /Timecode/ })).toHaveCount(0)
})
