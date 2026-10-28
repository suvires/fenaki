import { expect, test } from '@playwright/test'

// The development services, or those of the deployment under test (playwright.config.ts).
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025'
const LISTMONK = process.env.E2E_LISTMONK_URL ?? 'http://localhost:9000'
const LISTMONK_AUTH = `token fenaki-web:${process.env.LISTMONK_API_TOKEN ?? 'fenaki-dev-listmonk-token-change-me'}`

interface MailpitMessage {
  ID: string
  Subject: string
}

async function waitForEmail(to: string): Promise<{ Subject: string; HTML: string }> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)
    const { messages } = (await search.json()) as { messages: MailpitMessage[] }
    if (messages[0]) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)
      return (await message.json()) as { Subject: string; HTML: string }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No email for ${to} in Mailpit`)
}

async function listmonkSubscriber(email: string) {
  const url = new URL('/api/subscribers', LISTMONK)
  url.searchParams.set('query', `subscribers.email = '${email}'`)
  const response = await fetch(url, { headers: { Authorization: LISTMONK_AUTH } })
  const { data } = (await response.json()) as {
    data: { results: { id: number; lists: { subscription_status: string }[] }[] }
  }
  return data.results[0]
}

test('the landing page replaces the home: the hero and the waitlist form', async ({ page }) => {
  await page.goto('/es/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'El mejor cine, en cortos', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Avísame' })).toBeVisible()
  // Before launch the shorts are not public: nothing on the page shows or links them.
  await expect(page.getByRole('link', { name: /Timecode/ })).toHaveCount(0)
  await expect(page.getByRole('searchbox')).toHaveCount(0)
  // Before launch the footer only links the legal pages.
  await expect(
    page.getByRole('navigation', { name: 'Pie de página' }).getByRole('link'),
  ).toHaveText(['Aviso legal', 'Política de privacidad', 'Política de cookies'])
})

test('the catalog routes are not public before launch', async ({ request }) => {
  for (const path of [
    '/es/cortos',
    '/es/cortos/timecode',
    '/es/buscar',
    '/es/colecciones/imprescindibles-del-corto-espanol',
    '/es/personas/juanjo-gimenez',
    '/es/escaparates/escuela-de-cine-de-ejemplo',
    '/es/temas/familia',
    '/og/es/cortos/timecode.png',
  ])
    expect((await request.get(path)).status()).toBe(404)
  expect((await request.get('/api/search?q=madre')).status()).toBe(404)
})

test('the sponsorship page is public before launch, with the contact links', async ({
  page,
  request,
}) => {
  await page.goto('/es/patrocina')
  await expect(page.getByRole('heading', { level: 1, name: 'Patrocina FENAKI' })).toBeVisible()
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: 'Escaparates para festivales y escuelas' })
      .first(),
  ).toHaveAttribute('href', /^mailto:hola@fenaki\.tv\?subject=/)
  // Before launch the sitemap lists only the public pages.
  const sitemap = await (await request.get('/sitemap-es.xml')).text()
  expect(sitemap).toContain('/es/patrocina</loc>')
  expect(sitemap).not.toContain('/es/cortos')
})

test('the waitlist form explains what is wrong with the address', async ({ page }) => {
  await page.goto('/es/')
  const submit = page.getByRole('button', { name: 'Avísame' })
  await submit.click()
  await expect(page.getByText('Escribe tu email para que te avisemos.')).toBeVisible()
  await page.getByLabel('¿Quieres que te avisemos?').fill('ana@ejemplo')
  await submit.click()
  await expect(page.getByText('Ese email no parece completo.', { exact: false })).toBeVisible()
})

test('signing up sends a confirmation email that confirms the subscription in listmonk', async ({
  page,
}) => {
  const email = `e2e+${Date.now()}@example.com`
  await page.goto('/es/')
  await page.getByLabel('¿Quieres que te avisemos?').fill(email)
  await page.getByRole('button', { name: 'Avísame' }).click()
  await expect(page).toHaveURL(/\/es\/lista-de-espera\/revisa-tu-email$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Revisa tu email' })).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()

  const message = await waitForEmail(email)
  expect(message.Subject).toBe('Confirma tu email para que te avisemos')
  const origin = new URL(page.url()).origin.replace(/[./]/g, '\\$&')
  const link = new RegExp(`href="(${origin}/es/lista-de-espera/confirmar\\?s=[^"]+)"`).exec(
    message.HTML,
  )?.[1]
  expect(link).toBeDefined()

  try {
    // Only the launch notice: the form does not offer the weekly selection.
    expect((await listmonkSubscriber(email))?.lists.map((l) => l.subscription_status)).toEqual([
      'unconfirmed',
    ])
    await page.goto(link ?? '')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ya estás en la lista' }),
    ).toBeVisible()
    await expect(page.getByText('la recibirás los viernes por la mañana')).toHaveCount(0)
    expect((await listmonkSubscriber(email))?.lists.map((l) => l.subscription_status)).toEqual([
      'confirmed',
    ])

    await page.goto(link ?? '')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Este enlace ya no funciona' }),
    ).toBeVisible()
  } finally {
    const subscriber = await listmonkSubscriber(email)
    if (subscriber)
      await fetch(`${LISTMONK}/api/subscribers/${subscriber.id}`, {
        method: 'DELETE',
        headers: { Authorization: LISTMONK_AUTH },
      })
  }
})

test('the legal pages are linked from the footer, published without the draft notice', async ({
  page,
}) => {
  await page.goto('/es/')
  await page
    .getByRole('navigation', { name: 'Pie de página' })
    .getByRole('link', { name: 'Aviso legal' })
    .click()
  await expect(page).toHaveURL(/\/es\/aviso-legal$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Aviso legal' })).toBeVisible()
  await expect(page.getByText('Borrador', { exact: true })).toHaveCount(0)
  await expect(page.getByText('hola@fenaki.tv').first()).toBeVisible()
  await expect(page.getByText(/REVISAR|COMPLETAR/)).toHaveCount(0)
})

test('the credits page carries the TMDB attribution', async ({ page }) => {
  await page.goto('/es/creditos')
  await expect(page).toHaveURL(/\/es\/creditos$/)
  await expect(page.getByRole('img', { name: 'The Movie Database (TMDB)' })).toBeVisible()
  await expect(
    page.getByText('Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica.'),
  ).toBeVisible()
})

test('the site can be installed: a manifest with its icons', async ({ page, request }) => {
  await page.goto('/es/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBe('/manifest.webmanifest')
  const manifest = (await (await request.get(href ?? '')).json()) as {
    name: string
    start_url: string
    display: string
    icons: { src: string; sizes: string }[]
  }
  expect(manifest).toMatchObject({ name: 'FENAKI', start_url: '/es/', display: 'standalone' })
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('image/png')
  }
})
