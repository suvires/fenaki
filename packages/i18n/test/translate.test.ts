import { describe, expect, it } from 'vitest'
import { createTranslator, type MessageKey } from '../src/index.ts'

const t = createTranslator('es')

describe('createTranslator', () => {
  it('reads nested keys', () => {
    expect(t('short.player.play')).toBe('Ver ahora')
  })

  it('interpolates parameters', () => {
    expect(t('short.directedBy', { names: 'Juanjo Giménez' })).toBe('Dirigido por Juanjo Giménez')
  })

  it('selects plural forms with Intl.PluralRules', () => {
    expect(t('collection.eyebrow', { count: 1 })).toBe('Colección · 1 corto')
    expect(t('collection.eyebrow', { count: 6 })).toBe('Colección · 6 cortos')
  })

  it('formats numeric parameters for the locale', () => {
    expect(t('search.results', { count: 12000 })).toBe('12.000 cortos encontrados')
  })

  it('fails loudly on missing keys and parameters', () => {
    expect(() => t('short.nope' as MessageKey)).toThrow(/Missing message/)
    expect(() => t('short.directedBy')).toThrow(/Missing parameter "names"/)
    expect(() => t('collection.eyebrow')).toThrow(/numeric "count"/)
  })

  it('addresses the viewer as «tú», never «vosotros»', async () => {
    const { messages } = await import('../src/index.ts')
    const text = JSON.stringify(messages.es)
    expect(text).not.toMatch(/\b(vosotros|vuestr[oa]s?|os)\b/i)
    expect(text).not.toMatch(/vídeo|clip(?!s\b)/i)
  })
})
