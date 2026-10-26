/**
 * Content Security Policy of the site. No Astro imports, so tests can use it.
 *
 * Astro sends the policy as the Content-Security-Policy header of every page it renders
 * (`security.csp` in astro.config.ts), with the hashes of the scripts and styles it emits, so the
 * inline island scripts run and nothing else does. The static directives below go into the
 * config; the origins known only when the server starts (Umami, the CMS's public address, which
 * serves uploaded logos) are added by the layout as it renders (layouts/Base.astro). Responses
 * Astro does not render (redirects, API routes) get the fallback in security-headers.ts.
 */

/** The official players, framed only after the viewer presses play (lib/embed.ts). */
export const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com'
export const VIMEO_ORIGIN = 'https://player.vimeo.com'
export const PLAYER_ORIGINS = [YOUTUBE_ORIGIN, VIMEO_ORIGIN]

export const STATIC_DIRECTIVES = [
  "default-src 'self'",
  `frame-src ${PLAYER_ORIGINS.join(' ')}`,
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
] as const

/**
 * Inline style attributes the UI primitives render, allowed one by one by hash ('unsafe-hashes'
 * only lets these exact values through, never 'unsafe-inline'): Radix's roving focus group (the
 * home duration filters) renders style="outline:none".
 */
export const STYLE_ATTRIBUTES = {
  'outline:none': 'sha256-MtxTLcyxVEJFNLEIqbVTaqR4WWr0+lYSZ78AzGmNsuA=',
} as const

export interface RuntimeOrigins {
  /** Umami's tracking script; empty when analytics are off. */
  umamiScriptUrl?: string
  /** The CMS's public address, which serves uploaded media (organization logos). */
  cmsPublicUrl?: string
}

export interface RuntimePolicy {
  /** Sources for script-src, besides 'self' (config) and the hashes Astro adds. */
  scriptResources: string[]
  directives: (`img-src ${string}` | `connect-src ${string}`)[]
}

const origin = (url?: string) => {
  if (!url) return undefined
  try {
    return new URL(url).origin
  } catch {
    return undefined
  }
}

/** The script sources and directives that depend on the environment. */
export function runtimePolicy({ umamiScriptUrl, cmsPublicUrl }: RuntimeOrigins): RuntimePolicy {
  const umami = origin(umamiScriptUrl)
  const cms = origin(cmsPublicUrl)
  return {
    scriptResources: umami ? [umami] : [],
    directives: [
      `img-src ${["'self'", 'data:', cms].filter(Boolean).join(' ')}`,
      // Umami reports to /api/send on its own origin.
      `connect-src ${["'self'", umami].filter(Boolean).join(' ')}`,
    ],
  }
}
