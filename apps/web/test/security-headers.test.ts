import { describe, expect, it } from 'vitest'
import { SECURITY_HEADERS, withSecurityHeaders } from '../src/lib/security-headers.ts'

describe('withSecurityHeaders', () => {
  it('adds every header to a page', () => {
    const response = withSecurityHeaders(new Response('<p>hola</p>'))
    for (const [name, value] of Object.entries(SECURITY_HEADERS))
      expect(response.headers.get(name)).toBe(value)
  })

  it('keeps a header the response sets itself', () => {
    const response = withSecurityHeaders(
      new Response(null, { headers: { 'X-Frame-Options': 'SAMEORIGIN' } }),
    )
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
  })

  it('works on redirects, whose headers are immutable', () => {
    const response = withSecurityHeaders(Response.redirect('https://shortix.film/es/', 302))
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('https://shortix.film/es/')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('does not restrict what the embedded players need', () => {
    expect(SECURITY_HEADERS['Permissions-Policy']).not.toMatch(
      /fullscreen|autoplay|picture-in-picture/,
    )
  })
})
