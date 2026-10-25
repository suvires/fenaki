/**
 * Security headers for every response of the site. No Astro imports, so tests can use it.
 *
 * Pages carry Astro's full Content Security Policy (lib/csp.ts), which a response keeps; this one
 * is the fallback for what Astro does not render (redirects, API routes): no framing, no <base>
 * or plugin injection, forms only to the site itself. HSTS is ignored by browsers over plain HTTP,
 * so local development is unaffected. Permissions-Policy leaves fullscreen, autoplay and
 * picture-in-picture alone: the YouTube and Vimeo players need them.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy':
    "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
}

/** Adds the headers a response does not set itself. Redirects have immutable headers: copy them. */
export function withSecurityHeaders(response: Response): Response {
  let result = response
  try {
    apply(result.headers)
  } catch {
    result = new Response(response.body, response)
    apply(result.headers)
  }
  return result
}

function apply(headers: Headers) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS))
    if (!headers.has(name)) headers.set(name, value)
}
