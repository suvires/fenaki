import { describe, expect, it } from 'vitest'
import { createTranslator } from '@fenaki/i18n'
import { confirmationEmail } from '../src/lib/confirmation-email.ts'
import { contactLinks } from '../src/lib/contact.ts'
import { createRateLimit } from '../src/lib/rate-limit.ts'
import { isHiddenInMode } from '../src/lib/site-mode.ts'

describe('confirmationEmail', () => {
  it('uses the locale copy and leaves the link to listmonk', () => {
    const { subject, body } = confirmationEmail('es')
    expect(subject).toBe('Confirma tu email para que te avisemos')
    expect(body).toContain('Confirmar email')
    expect(body).toContain('src="{{ .Tx.Data.logo_url }}"')
    expect(body).toContain('href="{{ .Tx.Data.confirm_url }}"')
    expect(body).toContain('{{ .Tx.Data.site_url }}privacidad')
    expect(body).not.toMatch(/\{(legalNotice|privacyPolicy|url)\}/)
  })
})

describe('isHiddenInMode', () => {
  it('hides only the catalog routes, and only before launch', () => {
    for (const path of [
      '/es/cortos',
      '/es/cortos/cuerdas',
      '/es/colecciones/x',
      '/es/personas/nacho-vigalondo',
      '/es/escaparates/x',
      '/es/buscar',
      '/api/search',
      '/es/crear-cuenta',
      '/es/iniciar-sesion',
      '/es/cuenta',
      '/es/cuenta/verificar',
      '/es/historial',
      '/api/account/login',
    ])
      expect(isHiddenInMode(path, 'landing')).toBe(true)
    for (const path of [
      '/es/',
      '/es/aviso-legal',
      '/es/patrocina',
      '/es/lista-de-espera/confirmar',
      '/api/waitlist',
    ])
      expect(isHiddenInMode(path, 'landing')).toBe(false)
    expect(isHiddenInMode('/es/cortos/cuerdas', 'catalog')).toBe(false)
  })
})

describe('createRateLimit', () => {
  it('allows a number of requests per window and key', () => {
    const allow = createRateLimit(2, 1000)
    expect([allow('a', 0), allow('a', 1), allow('a', 2), allow('b', 2)]).toEqual([
      true,
      true,
      false,
      true,
    ])
    expect(allow('a', 1001)).toBe(true)
  })
})

describe('contactLinks', () => {
  const t = createTranslator('es')

  it('hides every contact link while there is no mailbox', () => {
    expect(contactLinks(undefined, t)).toBeUndefined()
    expect(contactLinks('', t)).toBeUndefined()
  })

  it('writes to the mailbox with one subject per topic', () => {
    expect(contactLinks('hola@fenaki.tv', t)?.propose).toEqual({
      href: 'mailto:hola@fenaki.tv?subject=Propuesta%20de%20corto',
      label: 'Proponer un corto',
    })
  })
})
