import node from '@astrojs/node'
import react from '@astrojs/react'
import { defaultLocale, locales } from '@shortix/i18n'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: { port: 4321 },
  devToolbar: { enabled: false },
  i18n: {
    locales: [...locales],
    defaultLocale,
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: true },
  },
  env: {
    schema: {
      CMS_URL: envField.string({
        context: 'server',
        access: 'public',
        default: 'http://localhost:3000',
      }),
      MEILISEARCH_HOST: envField.string({
        context: 'server',
        access: 'public',
        default: 'http://127.0.0.1:7700',
      }),
      MEILISEARCH_SEARCH_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
  vite: { plugins: [tailwindcss()] },
})
