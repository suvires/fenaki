import { defineConfig } from 'vitest/config'

// The CRM integration test needs `docker compose up -d` (PostgreSQL, Mailpit) and
// `docker compose --profile test up -d greenmail`; it uses its own database (`fenaki_crm_test`).
export default defineConfig({
  test: {
    include: ['test/integration/**/*.integration.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
})
