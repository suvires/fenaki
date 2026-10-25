import node from '@astrojs/node'
import react from '@astrojs/react'
import { defaultLocale, locales } from '@fenaki/i18n'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'
import { STATIC_DIRECTIVES, STYLE_ATTRIBUTES } from './src/lib/csp.ts'

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: { port: 4321 },
  devToolbar: { enabled: false },
  // A <meta> CSP with the hashes of every script and style Astro emits (src/lib/csp.ts). Not
  // applied by `astro dev`: test it on a build.
  security: {
    csp: {
      directives: [...STATIC_DIRECTIVES],
      scriptDirective: { resources: ["'self'"] },
      styleDirective: {
        resources: ["'self'", { resource: "'unsafe-hashes'", kind: 'attribute' }],
        hashes: Object.values(STYLE_ATTRIBUTES).map((hash) => ({ hash, kind: 'attribute' })),
      },
    },
  },
  i18n: {
    locales: [...locales],
    defaultLocale,
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: true },
  },
  env: {
    // Every variable is `secret` so it is read when the server starts, not fixed at build time:
    // one build serves the landing or the catalog, against any CMS, with or without the draft notice.
    schema: {
      CMS_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://localhost:3000',
      }),
      // The CMS's public address, for the media it serves (logos). Empty: CMS_URL.
      CMS_PUBLIC_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      MEILISEARCH_HOST: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://127.0.0.1:7700',
      }),
      MEILISEARCH_SEARCH_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
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
        default: 'fenaki-web',
      }),
      LISTMONK_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      LISTMONK_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      LAUNCH_DATE: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UMAMI_SCRIPT_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UMAMI_WEBSITE_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Development only: the «Lo más visto» rail shows the 10 latest shorts. Ignored in production.
      TOP10_PREVIEW: envField.boolean({ context: 'server', access: 'secret', default: false }),
      // Sentry (server-side errors). Empty: off.
      SENTRY_DSN: envField.string({ context: 'server', access: 'secret', optional: true }),
      SENTRY_ENVIRONMENT: envField.string({
        context: 'server',
        access: 'secret',
        default: 'production',
      }),
      SENTRY_RELEASE: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: { plugins: [tailwindcss()] },
})
