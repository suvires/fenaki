import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // The e2e tests run a second CMS next to the development one, in its own build directory.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@shortix/i18n'],
  agentRules: false,
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
