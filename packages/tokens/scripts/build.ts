import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { buildLightCss, buildPalettes, buildThemeCss } from '../src/build.ts'
import type { TokenFile } from '../src/types.ts'

const root = new URL('../', import.meta.url)
const dist = new URL('dist/', root)
const tokens = JSON.parse(await readFile(new URL('tokens.json', root), 'utf8')) as TokenFile

await mkdir(dist, { recursive: true })
await Promise.all([
  writeFile(new URL('theme.css', dist), buildThemeCss(tokens)),
  writeFile(new URL('light.css', dist), buildLightCss(tokens)),
  writeFile(new URL('palettes.json', dist), `${JSON.stringify(buildPalettes(tokens), null, 2)}\n`),
])
console.log('tokens: wrote dist/theme.css, dist/light.css, dist/palettes.json')
