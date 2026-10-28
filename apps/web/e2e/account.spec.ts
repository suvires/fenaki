import { expect, test, type Page } from '@playwright/test'

// Account emails go out through Payload's SMTP, which the e2e CMS points at Mailpit
// (playwright.config.ts), as the waitlist's do.
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025'
const PASSWORD = 'una-clave-de-prueba-1'

interface Mail {
  Subject: string
  HTML: string
}

/** The newest email to `to` whose subject contains `subject`. */
async function waitForEmail(to: string, subject: string): Promise<Mail> {
  for (let attempt = 0; attempt < 60; attempt++) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)
    const { messages } = (await search.json()) as { messages: { ID: string; Subject: string }[] }
    const found = messages.find((message) => message.Subject.includes(subject))
    if (found) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${found.ID}`)
      return (await message.json()) as Mail
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No email "${subject}" for ${to} in Mailpit`)
}

/** The site path (and query) of the link in an account email. */
function linkIn(mail: Mail, page: 'verificar' | 'restablecer' | 'confirmar-email'): string {
  const match = new RegExp(`href="([^"]*/es/cuenta/${page}\\?token=[^"]+)"`).exec(mail.HTML)
  if (!match?.[1]) throw new Error(`No ${page} link in the email`)
  const url = new URL(match[1].replaceAll('&amp;', '&'))
  return `${url.pathname}${url.search}`
}

const uniqueEmail = (name: string) =>
  `e2e+${name}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`

/** Pages are hydrated once the network is quiet: a form submitted before that would not run. */
const open = (page: Page, path: string) => page.goto(path, { waitUntil: 'networkidle' })

async function signUp(page: Page, email: string) {
  await open(page, '/es/crear-cuenta')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
  await page.getByRole('main').getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByRole('status')).toContainText('Revisa tu email')
}

async function verify(page: Page, email: string) {
  const mail = await waitForEmail(email, 'Verifica tu email')
  await open(page, linkIn(mail, 'verificar'))
  await expect(page.getByRole('status')).toContainText('Email verificado')
}

async function signIn(page: Page, email: string, password = PASSWORD, next?: string) {
  await open(page, `/es/iniciar-sesion${next ? `?next=${encodeURIComponent(next)}` : ''}`)
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('main').getByRole('button', { name: 'Iniciar sesión' }).click()
}

function watchViolations(page: Page): string[] {
  const violations: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text()))
      violations.push(`${page.url()}: ${message.text()}`)
  })
  return violations
}

/**
 * Each test comes from its own address (the limits are per address, and Cloudflare's header is
 * what the site reads), so one test's sign-ins never use up another's.
 */
const randomAddress = () =>
  `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ 'CF-Connecting-IP': randomAddress() })
})

const origin = (page: Page) => new URL(page.url()).origin

test('a viewer signs up, verifies, signs in, keeps a list, ratings and progress, and deletes the account', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const violations = watchViolations(page)
  let email = uniqueEmail('flow')

  // What a visitor kept in this browser before having an account.
  await open(page, '/es/')
  await page.evaluate(() => {
    localStorage.setItem(
      'fenaki:my-list:v1',
      JSON.stringify([
        { slug: 'cuerdas', title: 'Cuerdas', seconds: 600, tone: 'sala', savedAt: 1 },
      ]),
    )
    localStorage.setItem('fenaki:my-ratings:v1', JSON.stringify({ cuerdas: 'love' }))
  })

  await test.step('sign up and verify from the email', async () => {
    await signUp(page, email)
    // Signing in before verifying says so.
    await signIn(page, email)
    await expect(page.getByRole('alert')).toContainText('Aún no has verificado tu email')
    await verify(page, email)
    await page.getByRole('main').getByRole('link', { name: 'Iniciar sesión' }).click()
    await expect(page.getByRole('status')).toContainText(
      'Email verificado. Ya puedes iniciar sesión.',
    )
  })

  await test.step('sign in: the header changes and the browser’s list moves to the account', async () => {
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('main').getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/es\/$/)
    await expect(page.getByRole('button', { name: 'Cuenta', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveCount(0)
    await expect(
      page.getByRole('region', { name: 'Mi lista' }).locator('[data-short-card]'),
    ).toHaveCount(1)
    expect(await page.evaluate(() => localStorage.getItem('fenaki:my-list:v1'))).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('fenaki:my-ratings:v1'))).toBeNull()
    // The session cookie is not readable by scripts.
    expect(await page.evaluate(() => document.cookie)).toBe('')
  })

  await test.step('save a short and rate another from the preview', async () => {
    await open(page, '/es/cortos/madre')
    await page.getByRole('button', { name: 'Añadir a mi lista' }).click()
    await expect(page.getByRole('button', { name: 'En mi lista' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await open(page, '/es/')
    const card = page.locator('[data-short-card="alike"]').first()
    await card.scrollIntoViewIfNeeded()
    await card.hover()
    const preview = page.locator('[data-short-preview]')
    await expect(preview).toBeVisible()
    await preview.getByRole('button', { name: 'Valorar' }).hover()
    const love = preview.getByRole('button', { name: 'Me encanta' })
    await love.click()
    await expect(love).toHaveAttribute('aria-pressed', 'true')
    // Nothing in the browser's storage: it went to the account.
    expect(await page.evaluate(() => localStorage.getItem('fenaki:my-ratings:v1'))).toBeNull()
  })

  await test.step('after a reload both are still there, and the rail comes from the server', async () => {
    // The HTML as the server renders it, before any script runs.
    const html = await (await page.request.get('/es/')).text()
    expect(html).toContain('data-short-card="madre"')
    expect(html).toContain('data-short-card="cuerdas"')
    expect(html).toContain('data-signed-in="true"')

    await page.reload({ waitUntil: 'networkidle' })
    const list = page.getByRole('region', { name: 'Mi lista' })
    await expect(list.locator('[data-short-card]')).toHaveCount(2)
    const card = page.locator('[data-short-card="alike"]').first()
    await card.scrollIntoViewIfNeeded()
    await card.hover()
    const preview = page.locator('[data-short-preview]')
    await preview.getByRole('button', { name: 'Valorar' }).hover()
    await expect(preview.getByRole('button', { name: 'Me encanta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.mouse.move(0, 0)

    await open(page, '/es/mi-lista')
    await expect(page.getByRole('link', { name: /Madre/ })).toBeVisible()
    expect(await (await page.request.get('/es/mi-lista')).text()).toContain(
      'data-short-card="madre"',
    )
  })

  await test.step('viewing progress: «Seguir viendo», resume and the history', async () => {
    const headers = { Origin: origin(page) }
    // The sample shorts have no real player to play in CI: the player's own reports go through the
    // same route, driven here directly (the parsing of the players' messages has unit tests).
    const saved = await page.request.post('/api/account/viewings', {
      headers,
      data: { slug: 'timecode', position: 120, duration: 900 },
    })
    expect(saved.ok()).toBe(true)

    await open(page, '/es/')
    const rail = page.getByRole('region', { name: 'Seguir viendo' })
    await expect(rail.locator('[data-short-card="timecode"]')).toHaveCount(1)
    await expect(rail.getByRole('link', { name: /Visto al 13 %/ })).toBeVisible()
    // Right under the hero, above «Mi lista».
    expect(
      (
        await page
          .getByRole('region')
          .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label') ?? ''))
      ).filter((name) => name === 'Seguir viendo' || name === 'Mi lista'),
    ).toEqual(['Seguir viendo', 'Mi lista'])

    await open(page, '/es/cortos/timecode')
    await expect(page.getByRole('button', { name: 'Seguir viendo desde 2:00' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Empezar de nuevo' })).toBeVisible()

    // History: everything watched, with progress and a way to remove it.
    await open(page, '/es/historial')
    await expect(page.getByRole('link', { name: /Timecode/ })).toBeVisible()
    // On a screen with a pointer that hovers, from the card's preview (its aspa).
    await page.locator('[data-short-card="timecode"]').first().hover()
    await page
      .locator('[data-short-preview]')
      .getByRole('button', { name: 'Quitar del historial' })
      .click()
    await expect(page.getByText('Todavía no has visto ningún corto')).toBeVisible()

    // Finished viewings leave «Seguir viendo» but stay in the history.
    for (const position of [100, 850]) {
      await page.request.post('/api/account/viewings', {
        headers,
        data: { slug: 'alike', position, duration: 900 },
      })
    }
    await open(page, '/es/')
    await expect(page.getByRole('region', { name: 'Seguir viendo' })).toHaveCount(0)
    await open(page, '/es/historial')
    await expect(page.getByRole('link', { name: /Alike/ })).toBeVisible()
    await page.getByRole('button', { name: 'Borrar historial' }).click()
    await page.getByRole('button', { name: 'Sí, borrar todo' }).click()
    await expect(page.getByText('Todavía no has visto ningún corto')).toBeVisible()
  })

  await test.step('the account page: name, a copy of the data', async () => {
    await open(page, '/es/cuenta')
    await expect(page.getByText(`Has iniciado sesión como ${email}`)).toBeVisible()
    // Saved as it is typed: no button.
    await page.getByLabel('Nombre (opcional)').fill('Ana')
    await expect(page.getByText('Guardado.')).toBeVisible()
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByLabel('Nombre (opcional)')).toHaveValue('Ana')

    const exported = await page.request.get('/api/account/export')
    expect(exported.headers()['content-disposition']).toContain('attachment')
    const data = (await exported.json()) as {
      account: { email: string; name: string }
      myList: { short: { slug: string } }[]
      ratings: { short: { slug: string }; value: string }[]
    }
    expect(data.account).toMatchObject({ email, name: 'Ana' })
    expect(data.myList.map((item) => item.short.slug).sort()).toEqual(['cuerdas', 'madre'])
    expect(data.ratings).toContainEqual(expect.objectContaining({ value: 'love' }))
  })

  await test.step('sign out and sign in again', async () => {
    await page.getByRole('button', { name: 'Cuenta', exact: true }).click()
    await page.getByRole('banner').getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/es\/$/)
    await expect(page.getByRole('link', { name: 'Iniciar sesión' }).first()).toBeVisible()
    await open(page, '/es/cuenta')
    await expect(page).toHaveURL(/\/es\/iniciar-sesion\?next=%2Fes%2Fcuenta$/)

    // Signing in goes back to where the visitor was heading.
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('main').getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/es\/cuenta$/)
    await open(page, '/es/mi-lista')
    await expect(page.getByRole('link', { name: /Madre/ })).toBeVisible()
  })

  await test.step('forgot the password: the link in the email sets a new one', async () => {
    await page.getByRole('button', { name: 'Cuenta', exact: true }).click()
    await page.getByRole('banner').getByRole('button', { name: 'Cerrar sesión' }).click()
    await open(page, '/es/cuenta/recuperar')
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(page.getByRole('status')).toContainText(
      'Si hay una cuenta con ese email, te hemos enviado un enlace.',
    )
    const mail = await waitForEmail(email, 'Cambia tu contraseña')
    await open(page, linkIn(mail, 'restablecer'))
    await page.getByLabel('Contraseña nueva', { exact: true }).fill('otra-clave-distinta-2')
    await page.getByLabel('Repite la contraseña nueva').fill('otra-clave-distinta-2')
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()
    await expect(page).toHaveURL(/\/es\/iniciar-sesion\?notice=reset$/)
    await expect(page.getByRole('status')).toContainText('Contraseña cambiada')

    // The old one no longer works; the new one does.
    await signIn(page, email)
    await expect(page.getByRole('alert')).toContainText('Email o contraseña incorrectos')
    await signIn(page, email, 'otra-clave-distinta-2')
    await expect(page.getByRole('button', { name: 'Cuenta', exact: true })).toBeVisible()
  })

  await test.step('change the email: it changes once the link sent to the new one is opened', async () => {
    const next = uniqueEmail('moved')
    await open(page, '/es/cuenta')
    await page.getByRole('button', { name: 'Cambiar email' }).click()
    const dialog = page.getByRole('dialog', { name: 'Cambiar tu email' })
    await dialog.getByLabel('Email nuevo').fill(next)
    await dialog.getByLabel('Tu contraseña').fill('no-es-esta-clave-1')
    await dialog.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(dialog.getByText('La contraseña no es correcta.')).toBeVisible()
    await dialog.getByLabel('Tu contraseña').fill('otra-clave-distinta-2')
    await dialog.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(page.getByRole('status').filter({ hasText: next })).toBeVisible()
    // Until the link is opened, the account keeps the old email.
    await expect(page.getByText(`Has iniciado sesión como ${email}`)).toBeVisible()
    const mail = await waitForEmail(next, 'Confirma tu nuevo email')
    await open(page, linkIn(mail, 'confirmar-email'))
    await expect(page.getByRole('status')).toContainText('Tu cuenta ya usa este email')
    email = next
    await open(page, '/es/cuenta')
    await expect(page.getByText(`Has iniciado sesión como ${email}`)).toBeVisible()
  })

  await test.step('delete the account', async () => {
    await open(page, '/es/cuenta')
    await page.getByRole('button', { name: 'Borrar mi cuenta' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Seguro que quieres borrar tu cuenta?' })
    await dialog.getByLabel('Contraseña', { exact: true }).fill('no-es-esta-clave-1')
    await dialog.getByRole('button', { name: 'Sí, borrar mi cuenta' }).click()
    await expect(dialog.getByText('La contraseña no es correcta.')).toBeVisible()
    await dialog.getByLabel('Contraseña', { exact: true }).fill('otra-clave-distinta-2')
    await dialog.getByRole('button', { name: 'Sí, borrar mi cuenta' }).click()
    await expect(page).toHaveURL(/\/es\/iniciar-sesion\?notice=deleted$/)
    await expect(page.getByRole('status')).toContainText('Tu cuenta se ha borrado')

    await signIn(page, email, 'otra-clave-distinta-2')
    await expect(page.getByRole('alert')).toContainText('Email o contraseña incorrectos')
  })

  expect(violations).toEqual([])
})

test('signing up again with an address that has an account looks the same as a new one', async ({
  page,
}) => {
  const email = uniqueEmail('twice')
  await signUp(page, email)
  await verify(page, email)
  // The same form, the same answer: nothing says the address is taken.
  await signUp(page, email)
  await expect(page.getByRole('status')).toContainText(`Si ${email} puede crear una cuenta`)
})

test('forgetting a password answers the same for an address without an account', async ({
  page,
}) => {
  await open(page, '/es/cuenta/recuperar')
  await page.getByLabel('Email', { exact: true }).fill(uniqueEmail('nobody'))
  await page.getByRole('button', { name: 'Enviar enlace' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Si hay una cuenta con ese email, te hemos enviado un enlace.',
  )
})

test('account pages are not indexed, the forms validate in the browser, and a bad link says so', async ({
  page,
}) => {
  for (const path of ['/es/crear-cuenta', '/es/iniciar-sesion', '/es/cuenta/recuperar']) {
    await open(page, path)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  }
  const sitemap = await (await page.request.get('/sitemap-es.xml')).text()
  expect(sitemap).not.toMatch(/crear-cuenta|iniciar-sesion|\/cuenta|historial/)

  await open(page, '/es/crear-cuenta')
  await page.getByLabel('Email', { exact: true }).fill('sin-arroba')
  await page.getByLabel('Contraseña', { exact: true }).fill('corta')
  await page.getByRole('main').getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByText('Ese email no parece completo.', { exact: false })).toBeVisible()
  await expect(page.getByText('La contraseña debe tener al menos 10 caracteres.')).toBeVisible()

  await open(page, '/es/cuenta/verificar?token=0123456789abcdef0123456789abcdef01234567')
  await expect(page.getByRole('alert')).toContainText('El enlace no es válido o ya se utilizó')
  await open(page, '/es/cuenta/restablecer')
  await expect(page.getByRole('alert')).toContainText('El enlace no es válido o ha caducado')
})

test('the sign-in page only goes back to paths of this site', async ({ page }) => {
  const email = uniqueEmail('next')
  await signUp(page, email)
  await verify(page, email)
  await signIn(page, email, PASSWORD, '//evil.example/steal')
  await expect(page).toHaveURL(/\/es\/$/)
  await expect(page.getByRole('button', { name: 'Cuenta', exact: true })).toBeVisible()
})

test('state-changing account routes refuse other origins, and the limits and guards hold', async ({
  request,
  baseURL,
}) => {
  const json = { 'Content-Type': 'application/json', 'CF-Connecting-IP': randomAddress() }
  const login = '/api/account/login'
  const body = JSON.stringify({ email: 'nadie@example.com', password: 'una-clave-larga-1' })

  expect((await request.post(login, { headers: json, data: body })).status()).toBe(403)
  const foreign = await request.post(login, {
    headers: { ...json, Origin: 'https://evil.example' },
    data: body,
  })
  expect(foreign.status()).toBe(403)
  expect(await foreign.json()).toEqual({ error: 'origin' })

  // From this site: refused as a wrong password, never saying whether the address exists.
  const own = await request.post(login, { headers: { ...json, Origin: baseURL ?? '' }, data: body })
  expect(own.status()).toBe(401)
  expect(await own.json()).toEqual({ error: 'invalid' })

  // Anything that needs an account says so without one.
  const list = await request.put('/api/account/list', {
    headers: { ...json, Origin: baseURL ?? '' },
    data: { slug: 'madre' },
  })
  expect(list.status()).toBe(401)
  expect((await request.get('/api/account/export')).status()).toBe(401)
  expect((await request.get('/api/account/me')).status()).toBe(401)
})

test('Astro origin check: the sign-out form passes from behind the proxy, a foreign origin does not', async ({
  request,
}) => {
  test.skip(Boolean(process.env.E2E_CATALOG_URL), 'needs the build served by e2e/serve.sh')
  // The site is built for https://fenaki.test (e2e/serve.sh). kamal-proxy terminates TLS and tells
  // the app with X-Forwarded-*; a browser posting the form sends Origin: https://fenaki.test.
  const proxied = {
    'X-Forwarded-Proto': 'https',
    'X-Forwarded-Host': 'fenaki.test',
    'CF-Connecting-IP': randomAddress(),
  }
  const own = await request.post('/api/account/logout', {
    headers: { ...proxied, Origin: 'https://fenaki.test' },
    form: {},
    maxRedirects: 0,
  })
  expect(own.status()).toBe(303)

  const foreign = await request.post('/api/account/logout', {
    headers: { ...proxied, Origin: 'https://evil.example' },
    form: {},
    maxRedirects: 0,
  })
  expect(foreign.status()).toBe(403)
  // Astro's own refusal (the route's would be JSON): the check is on.
  expect(await foreign.text()).toContain('Cross-site POST form submissions are forbidden')
})

test('«Sube tu corto» asks to sign in, then checks the link and the terms', async ({ page }) => {
  await open(page, '/es/sube-tu-corto')
  await expect(page.getByRole('heading', { level: 1, name: 'Sube tu corto' })).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/es\/iniciar-sesion\?next=%2Fes%2Fsube-tu-corto$/)

  const email = uniqueEmail('submit')
  await signUp(page, email)
  await verify(page, email)
  await signIn(page, email, PASSWORD, '/es/sube-tu-corto')
  await expect(page).toHaveURL(/\/es\/sube-tu-corto$/)
  await expect(page.getByText('Todavía no has enviado ningún corto.')).toBeVisible()

  // Everything missing is said under its field, before anything is sent.
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Elige quién lo envía.')).toBeVisible()
  await expect(page.getByText('Marca la casilla para aceptar las condiciones.')).toBeVisible()

  // Only YouTube or Vimeo: the server refuses anything else, without asking any provider.
  await page.getByLabel('Enlace del corto').fill('https://example.com/mi-corto')
  await page.getByLabel('¿Quién lo envía?').selectOption('author')
  await page.getByLabel(/Declaro que el canal es mío/).check()
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Pega el enlace de un corto de YouTube o Vimeo.')).toBeVisible()
})
