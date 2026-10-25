import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.STORYBOOK_PORT ?? 6116)

/**
 * Visual regression over every Storybook story. Always runs inside the official Playwright image
 * (locally through `pnpm test:visual`, and in CI), so baselines render identically everywhere.
 */
export default defineConfig({
  testDir: 'visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide' } },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'node scripts/serve-storybook.ts',
    url: `http://localhost:${port}/index.json`,
    reuseExistingServer: false,
  },
})
