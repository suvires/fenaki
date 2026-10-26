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
  // Playwright's default threshold (0.2) let a token's opacity change pass unseen; 0 failed at random,
  // as Chromium rasterizes rounded, scaled images a few levels differently from run to run (up to 5 of
  // 255). 0.03 absorbs that and still catches any colour change of about 8 levels or more.
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', threshold: 0.03 } },
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
