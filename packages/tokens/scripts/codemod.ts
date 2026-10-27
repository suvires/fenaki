/**
 * Renames old token uses (Tailwind classes and CSS variables) to the names in scripts/migration.ts,
 * in place. It ran once for the October 2026 migration and is kept as its record; it is idempotent.
 * Palette keys in TypeScript (`palettes.dark['sala-0']`) were renamed by hand.
 *
 *   node packages/tokens/scripts/codemod.ts <file>...
 */
import { readFile, writeFile } from 'node:fs/promises'
import { CLASSES, VARIABLES } from './migration.ts'

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
/** A whole name: not part of a longer class or variable. */
const whole = (name: string) => new RegExp(`(?<![\\w-])${escape(name)}(?![\\w-])`, 'g')

const rules: [RegExp, string][] = [
  ...Object.entries(VARIABLES)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([from, to]): [RegExp, string] => [whole(from), to]),
  ...CLASSES.map(([from, to]): [RegExp, string] => [whole(from), to]),
]

export function migrate(source: string): string {
  return rules.reduce((text, [pattern, to]) => text.replace(pattern, to), source)
}

const files = process.argv.slice(2)
let changed = 0
for (const file of files) {
  const before = await readFile(file, 'utf8')
  const after = migrate(before)
  if (after !== before) {
    await writeFile(file, after)
    changed++
  }
}
console.log(`codemod: ${changed} of ${files.length} files changed`)
