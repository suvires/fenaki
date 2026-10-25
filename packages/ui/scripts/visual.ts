/**
 * Runs the visual regression tests inside the official Playwright image, the same one CI uses,
 * so screenshots match across machines. Builds Storybook on the host first.
 *
 *   node scripts/visual.ts                      compare against the baselines
 *   node scripts/visual.ts --update-snapshots   accept the current rendering as the new baselines
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const IMAGE = 'mcr.microsoft.com/playwright:v1.64.1-noble'
const repo = fileURLToPath(new URL('../../../', import.meta.url))

// Baselines are only accepted from linux/arm64 (Apple Silicon and the CI runner): text renders
// slightly differently on other architectures, and the comparison has no tolerance.
const updating = process.argv.includes('--update-snapshots') || process.argv.includes('-u')
if (process.arch !== 'arm64') {
  if (updating) {
    console.error('Baselines can only be generated on arm64 (Apple Silicon). Not updating them.')
    process.exit(1)
  }
  console.warn('Comparing on a non-arm64 machine: text rendering differences may fail the run.')
}

try {
  execFileSync('docker', ['info'], { stdio: 'ignore' })
} catch {
  console.error('Docker is not running. On macOS with OrbStack: open -a OrbStack')
  process.exit(1)
}

execFileSync('pnpm', ['--filter', '@fenaki/tokens', 'build'], { cwd: repo, stdio: 'inherit' })
execFileSync('pnpm', ['--filter', '@fenaki/ui', 'build-storybook', '--quiet'], {
  cwd: repo,
  stdio: 'inherit',
})

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--ipc=host',
    '-v',
    `${repo}:/repo`,
    '-w',
    '/repo/packages/ui',
    IMAGE,
    './node_modules/.bin/playwright',
    'test',
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 1)
