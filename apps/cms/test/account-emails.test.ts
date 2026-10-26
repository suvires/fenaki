import { describe, expect, it } from 'vitest'
import {
  accountEmailHtml,
  accountEmailSubject,
  accountLink,
  siteOrigin,
} from '../src/accounts/emails.ts'
import { isCompleted } from '../src/collections/Viewings.ts'

describe('account emails', () => {
  it('link to the site, never to the CMS', () => {
    expect(accountLink('verify', 'abc123', 'es', 'https://fenaki.tv')).toBe(
      'https://fenaki.tv/es/cuenta/verificar?token=abc123',
    )
    expect(accountLink('reset', 'a b&c', 'es', 'https://fenaki.tv')).toBe(
      'https://fenaki.tv/es/cuenta/restablecer?token=a%20b%26c',
    )
  })

  it('takes the site address from WEB_URL, without a trailing slash', () => {
    expect(siteOrigin({ WEB_URL: 'https://fenaki.tv/' })).toBe('https://fenaki.tv')
    expect(siteOrigin({})).toBe('http://localhost:4321')
  })

  it('are in Spanish, in the light palette, with the link as button and as fallback text', () => {
    const url = 'https://fenaki.tv/es/cuenta/verificar?token=abc&x=1'
    const html = accountEmailHtml('verify', url, 'es', 'https://fenaki.tv')
    expect(accountEmailSubject('verify')).toBe('Verifica tu correo en Fenaki')
    expect(html).toContain('lang="es"')
    expect(html).toContain('name="color-scheme" content="light"')
    // Escaped inside attributes, so the query string survives.
    expect(html).toContain('href="https://fenaki.tv/es/cuenta/verificar?token=abc&amp;x=1"')
    expect(html).toContain('Verificar mi correo')
    expect(html).toContain('https://fenaki.tv/es/privacidad')
    expect(html).not.toMatch(/\b(vosotros|vuestr)/i)
  })

  it('tell the reset link lasts one hour', () => {
    const html = accountEmailHtml('reset', 'https://fenaki.tv/es/cuenta/restablecer?token=t')
    expect(html).toContain('caduca en 1 hora')
    expect(accountEmailSubject('reset')).toBe('Elige una contraseña nueva en Fenaki')
  })
})

describe('isCompleted', () => {
  it('counts a viewing as finished from 90 % of the duration', () => {
    expect(isCompleted(539, 600)).toBe(false)
    expect(isCompleted(540, 600)).toBe(true)
    expect(isCompleted(10, 0)).toBe(false)
  })
})
