import { expect, test, type Page } from '@playwright/test'

/**
 * The Content Security Policy (src/lib/csp.ts) lets the site work and nothing else run: every
 * page is served with the policy and the hashes of its scripts, and visiting and using the pages
 * reports no violation. Runs in both projects: the catalog and the landing page.
 */
function watchViolations(page: Page): string[] {
  const violations: string[] = []
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text()))
      violations.push(`${page.url()}: ${message.text()}`)
  })
  return violations
}

async function visit(page: Page, path: string) {
  const response = await page.goto(path)
  const policy = response?.headers()['content-security-policy']
  expect(policy).toMatch(/script-src 'self'[^;]*'sha256-/)
  expect(policy).toContain('frame-src https://www.youtube-nocookie.com https://player.vimeo.com')
  expect(policy).toContain("object-src 'none'")
  expect(policy).toContain("frame-ancestors 'none'")
  expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/)
}

test('the catalog pages run under the policy', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'catalog', 'catalog pages')
  const violations = watchViolations(page)

  await visit(page, '/es/')
  // A hydrated island: the header's genres menu.
  await page.getByRole('button', { name: 'Géneros' }).first().click()
  await expect(page.getByRole('link', { name: 'Animación' }).first()).toBeVisible()

  await visit(page, '/es/cortos/timecode')
  await page.getByRole('button', { name: 'Ver ahora' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  // The search island must be hydrated before typing, or the keystrokes are lost.
  await page.goto('/es/buscar', { waitUntil: 'networkidle' })
  await page.getByRole('searchbox', { name: 'Buscar cortos' }).fill('vigalondo')
  await expect(page.getByText('1 corto encontrado')).toBeVisible({ timeout: 15_000 })

  await visit(page, '/es/escaparates/escuela-de-cine-de-ejemplo')

  expect(violations).toEqual([])
})

test('the landing page and the waitlist form run under the policy', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'landing', 'landing page')
  const violations = watchViolations(page)

  await visit(page, '/es/')
  // A hydrated island: the form validates in the browser.
  await page.getByLabel('Correo electrónico').fill('ana@ejemplo')
  await page.getByRole('button', { name: 'Apuntarme' }).click()
  await expect(page.getByText('Ese correo no parece completo.', { exact: false })).toBeVisible()

  expect(violations).toEqual([])
})
