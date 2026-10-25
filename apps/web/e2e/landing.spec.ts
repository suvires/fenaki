import { expect, test } from '@playwright/test'

// The development services, or those of the deployment under test (playwright.config.ts).
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025'
const LISTMONK = process.env.E2E_LISTMONK_URL ?? 'http://localhost:9000'
const LISTMONK_AUTH = `token shortix-web:${process.env.LISTMONK_API_TOKEN ?? 'shortix-dev-listmonk-token-change-me'}`

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

test('the landing page replaces the home and shows a launch collection', async ({ page }) => {
  await page.goto('/es/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Cortometrajes, no clips.' }),
  ).toBeVisible()
  await expect(page.getByText('Una de las colecciones de lanzamiento')).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Imprescindibles del corto español' }),
  ).toBeVisible()
  // Before launch the shorts are not public: the sample cards are not links.
  await expect(page.getByRole('link', { name: /Timecode/ })).toHaveCount(0)
  await expect(page.getByRole('searchbox')).toHaveCount(0)
  // These tests run with a contact mailbox: proposals and sponsorship write to it.
  await expect(page.getByRole('link', { name: 'Proponer un corto' }).first()).toHaveAttribute(
    'href',
    'mailto:hola@shortix.film?subject=Propuesta%20de%20corto',
  )
  await expect(
    page.getByRole('navigation', { name: 'Pie de página' }).getByRole('link', {
      name: 'Patrocinar una colección',
    }),
  ).toBeVisible()
})

test('the catalog routes are not public before launch', async ({ request }) => {
  for (const path of [
    '/es/cortos/timecode',
    '/es/buscar',
    '/es/colecciones/imprescindibles-del-corto-espanol',
  ])
    expect((await request.get(path)).status()).toBe(404)
  expect((await request.get('/api/search?q=madre')).status()).toBe(404)
})

test('the waitlist form explains what is wrong with the address', async ({ page }) => {
  await page.goto('/es/')
  const submit = page.getByRole('button', { name: 'Apuntarme' })
  await submit.click()
  await expect(page.getByText('Escribe tu correo para apuntarte.')).toBeVisible()
  await page.getByLabel('Correo electrónico').fill('ana@ejemplo')
  await submit.click()
  await expect(page.getByText('Ese correo no parece completo.', { exact: false })).toBeVisible()
})

test('signing up sends a confirmation email that confirms the subscription in listmonk', async ({
  page,
  baseURL,
}) => {
  const email = `e2e+${Date.now()}@example.com`
  await page.goto('/es/')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel(/selección semanal/).check()
  await page.getByRole('button', { name: 'Apuntarme' }).click()
  await expect(page.getByText('Revisa tu correo')).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()

  const message = await waitForEmail(email)
  expect(message.Subject).toBe('Confirma tu correo para la lista de Shortix')
  const confirmUrl = `${baseURL}/es/lista-de-espera/confirmar?s=`.replace(/[.?/]/g, '\\$&')
  const link = new RegExp(`href="(${confirmUrl}[^"]+)"`).exec(message.HTML)?.[1]
  expect(link).toBeDefined()

  try {
    expect((await listmonkSubscriber(email))?.lists.map((l) => l.subscription_status)).toEqual([
      'unconfirmed',
      'unconfirmed',
    ])
    await page.goto(link ?? '')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ya estás en la lista' }),
    ).toBeVisible()
    await expect(
      page.getByText('la recibirás los viernes por la mañana cuando empiece'),
    ).toBeVisible()
    expect((await listmonkSubscriber(email))?.lists.map((l) => l.subscription_status)).toEqual([
      'confirmed',
      'confirmed',
    ])

    await page.goto(link ?? '')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Este enlace ya no sirve' }),
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

test('the legal pages are linked from the footer and marked as drafts', async ({ page }) => {
  await page.goto('/es/')
  await page
    .getByRole('navigation', { name: 'Pie de página' })
    .getByRole('link', { name: 'Aviso legal' })
    .click()
  await expect(page).toHaveURL(/\/es\/aviso-legal$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Aviso legal' })).toBeVisible()
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible()
  await expect(page.getByText('[NOMBRE Y APELLIDOS]').first()).toBeVisible()
  await expect(page.getByText('REVISAR')).toHaveCount(0)
})
