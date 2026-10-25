import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests against the running stack. Needs `docker compose up -d` and `pnpm seed` first;
 * starts the CMS and the web if they are not already running.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4321', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @shortix/cms dev:next',
      url: 'http://localhost:3000/api/shorts?limit=1',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'pnpm --filter @shortix/web dev',
      url: 'http://localhost:4321/es/',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
