import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests against their own stack, so they never touch the development data: a CMS on
 * port 3100 with the `shortix_test` database (migrated and loaded with the sample seed on start)
 * and the `test_` search indexes, and one build of the site served in catalog mode on 4400 and
 * in landing mode on 4401.
 * Needs `docker compose up -d` and `pnpm setup:services`; the waitlist test uses listmonk and
 * reads the confirmation email from Mailpit.
 */
const CMS_URL = 'http://localhost:3100'
/**
 * Or against a running deployment, with no servers started here: E2E_CATALOG_URL (a site in
 * catalog mode with the sample seed) and E2E_LANDING_URL (a site in landing mode), plus
 * E2E_MAILPIT_URL, E2E_LISTMONK_URL and LISTMONK_API_TOKEN for the waitlist test. The local
 * deploy rehearsal uses this (docs/deploy.md).
 */
const external = { catalog: process.env.E2E_CATALOG_URL, landing: process.env.E2E_LANDING_URL }
const test = {
  DATABASE_URL: 'postgres://shortix:shortix@127.0.0.1:5432/shortix_test',
  SEARCH_INDEX_PREFIX: 'test_',
}
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'catalog',
      testMatch: 'smoke.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: external.catalog ?? 'http://localhost:4400' },
    },
    {
      name: 'landing',
      testMatch: 'landing.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: external.landing ?? 'http://localhost:4401' },
    },
  ],
  webServer:
    external.catalog || external.landing
      ? []
      : [
          {
            command:
              'pnpm --filter @shortix/cms migrate && pnpm --filter @shortix/cms seed && pnpm --filter @shortix/cms exec next dev --port 3100',
            url: `${CMS_URL}/api/shorts?limit=1`,
            env: {
              ...test,
              PAYLOAD_PUBLIC_SERVER_URL: CMS_URL,
              NEXT_DIST_DIR: '.next-e2e',
              NODE_OPTIONS: '--no-deprecation',
            },
            reuseExistingServer: !process.env.CI,
            timeout: 240_000,
          },
          {
            // A production build, served twice: catalog mode on 4400 and landing mode on 4401.
            command: 'sh e2e/serve.sh',
            url: 'http://localhost:4401/es/',
            env: {
              ...test,
              CMS_URL,
              HOST: 'localhost',
              // Real visitors only: the tests never reach Umami.
              UMAMI_SCRIPT_URL: '',
            },
            reuseExistingServer: !process.env.CI,
            timeout: 240_000,
          },
        ],
})
