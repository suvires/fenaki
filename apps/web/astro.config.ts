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
      // The variables below are `secret` so they are read when the server starts, not fixed at
      // build time: one image serves the landing or the catalog, with or without the draft notice.
      SEARCH_INDEX_PREFIX: envField.string({ context: 'server', access: 'secret', default: '' }),
      SITE_MODE: envField.enum({
        context: 'server',
        access: 'secret',
        values: ['landing', 'catalog'],
        default: 'catalog',
      }),
      SITE_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://localhost:4321',
      }),
      LEGAL_DRAFT: envField.boolean({ context: 'server', access: 'secret', default: true }),
      LISTMONK_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://localhost:9000',
      }),
      LISTMONK_API_USER: envField.string({
        context: 'server',
        access: 'secret',
        default: 'shortix-web',
      }),
      LISTMONK_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      LISTMONK_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UMAMI_SCRIPT_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UMAMI_WEBSITE_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: { plugins: [tailwindcss()] },
})
