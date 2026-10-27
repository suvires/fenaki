import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CLASSES, VARIABLES } from '../scripts/migration.ts'

/**
 * The October 2026 migration renamed every token (scripts/migration.ts). This fails if an old name
 * comes back as a class, a CSS variable, a palette key or a component prop value. The poster tones
 * (`sala`, `tungsteno`, `plata`, `telon`) are stored data, not token names, and stay.
 */
const repo = fileURLToPath(new URL('../../../', import.meta.url))

/** Where old names may appear: the migration record and the frozen prototype in design/system. */
const EXEMPT = [
  /^packages\/tokens\/scripts\/(migration|codemod)\.ts$/,
  /^packages\/tokens\/test\/old-names\.test\.ts$/,
  /^design\/system\/(?!README\.md$)/,
  /^apps\/cms\/src\/migrations\//,
  /^private\//,
]
const TEXT = /\.(tsx?|astro|css|mjs|js|md|mdx|html)$/
/** Markdown can quote the old names inside a marked region (the migration table). */
const QUOTED = /<!-- old-names:start -->[\s\S]*?<!-- old-names:end -->/g

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
const whole = (names: string[]) =>
  new RegExp(`(?<![\\w-])(?:${names.map(escape).join('|')})(?![\\w-])`, 'g')

const OLD_COLORS =
  'sala-[012]|line|line-strong|veil|ink|ink-muted|ink-inverse|tungsteno|tungsteno-hover|tungsteno-text|tungsteno-soft|on-tungsteno|telon|on-telon|plata|plata-soft'
const PATTERNS: [string, RegExp][] = [
  [
    'colour class',
    new RegExp(
      `(?<![\\w-])(?:bg|text|border(?:-[xytblrse])?|fill|stroke|from|via|to|ring|outline|decoration|accent|caret|divide|placeholder|shadow)-(?:${OLD_COLORS})(?![\\w-])`,
      'g',
    ),
  ],
  ['class', whole(CLASSES.map(([from]) => from))],
  ['CSS variable', whole(Object.keys(VARIABLES))],
  [
    'palette key',
    /\[['"](?:sala-[012]|ink|ink-muted|ink-inverse|on-tungsteno|tungsteno(?:-\w+)?|plata(?:-soft)?|telon|on-telon|line(?:-strong)?|veil)['"]\]/g,
  ],
  [
    'palette key',
    /(?<![\w$])(?:palettes\.(?:dark|light)|color|card)\.(?:ink|tungsteno|telon|plata|veil|line)\b/g,
  ],
  [
    'name in docs',
    /`(?:sala-[012]|ink|ink-muted|ink-inverse|line|line-strong|veil|tungsteno-\w+|on-tungsteno|on-telon|plata-soft|radius-(?:hero|panel)|shadow-(?:card|hover|hero)|ratio-(?:poster|still)|space-\d+)`/g,
  ],
  ['prop value', /\b(?:surface=\{?['"](?:sala|telon)['"]|variant=['"]veil['"])/g],
]

function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8' })
    .split('\n')
    .filter((file) => TEXT.test(file) && !EXEMPT.some((pattern) => pattern.test(file)))
}

describe('old token names', () => {
  it('appear nowhere outside the migration record', () => {
    const found: string[] = []
    for (const file of trackedFiles()) {
      let text: string
      try {
        text = readFileSync(`${repo}${file}`, 'utf8')
      } catch {
        continue // deleted in the working tree
      }
      if (file.endsWith('.md')) text = text.replace(QUOTED, '')
      for (const [kind, pattern] of PATTERNS)
        if (kind !== 'name in docs' || /\.mdx?$/.test(file))
          for (const match of text.matchAll(pattern)) found.push(`${file}: ${kind} ${match[0]}`)
    }
    expect(found).toEqual([])
  })
})
