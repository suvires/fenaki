import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Security headers on every response of the admin panel and the API. Browsers ignore HSTS over
 * plain HTTP, so local development is unaffected. The CMS is never indexed: only the site is.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
]

const nextConfig: NextConfig = {
  // The e2e tests run a second CMS next to the development one, in its own build directory.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@fenaki/i18n', '@fenaki/waitlist'],
  agentRules: false,
  poweredByHeader: false,
  headers: async () => [{ source: '/:path*', headers: securityHeaders }],
  // The CMS host has no home page: send it to the admin panel.
  redirects: async () => [{ source: '/', destination: '/admin', permanent: false }],
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: { root: path.resolve(dirname, '../..') },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
