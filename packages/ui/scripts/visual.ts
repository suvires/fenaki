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

try {
  execFileSync('docker', ['info'], { stdio: 'ignore' })
} catch {
  console.error('Docker is not running. On macOS with OrbStack: open -a OrbStack')
  process.exit(1)
}

execFileSync('pnpm', ['--filter', '@shortix/tokens', 'build'], { cwd: repo, stdio: 'inherit' })
execFileSync('pnpm', ['--filter', '@shortix/ui', 'build-storybook', '--quiet'], {
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
