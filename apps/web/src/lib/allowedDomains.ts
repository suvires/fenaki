/**
 * The domain Astro may trust `X-Forwarded-Proto` and `X-Forwarded-Host` from (the proxy in front
 * sets them), derived from the public address. Without it Astro sees `http://` behind the
 * TLS-terminating proxy and its origin check refuses a form posted from `https://`.
 * Read when the site is built (the manifest keeps it), so the image is built for one address.
 */
export interface AllowedDomain {
  protocol: string
  hostname: string
  port?: string
}

export function allowedDomains(siteUrl: string | undefined): AllowedDomain[] {
  if (!siteUrl) return []
  let url: URL
  try {
    url = new URL(siteUrl)
  } catch {
    return []
  }
  const domain: AllowedDomain = { protocol: url.protocol.slice(0, -1), hostname: url.hostname }
  if (url.port) domain.port = url.port
  return [domain]
}
