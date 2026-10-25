/** Server-side configuration read when the server starts (see astro.config.ts). */
import {
  CMS_PUBLIC_URL,
  CMS_URL,
  CONTACT_EMAIL,
  LAUNCH_DATE,
  LEGAL_DRAFT,
  LISTMONK_API_TOKEN,
  LISTMONK_API_USER,
  LISTMONK_FROM_EMAIL,
  LISTMONK_URL,
  SITE_MODE,
  SITE_URL,
  UMAMI_SCRIPT_URL,
  UMAMI_WEBSITE_ID,
} from 'astro:env/server'
import { createListmonk, type Listmonk } from '@fenaki/waitlist'
import type { BadgeClock } from './catalog.ts'
import { runtimePolicy } from './csp.ts'
import type { SiteMode } from './site-mode.ts'

export const siteMode: SiteMode = SITE_MODE
export const siteUrl = SITE_URL
export const legalDraft = LEGAL_DRAFT

/** Cookieless analytics: loaded only when both are set. */
export const umami =
  UMAMI_SCRIPT_URL && UMAMI_WEBSITE_ID
    ? { scriptUrl: UMAMI_SCRIPT_URL, websiteId: UMAMI_WEBSITE_ID }
    : undefined

/** This environment's part of the Content Security Policy (lib/csp.ts). */
export const csp = runtimePolicy({
  umamiScriptUrl: umami?.scriptUrl,
  cmsPublicUrl: CMS_PUBLIC_URL || CMS_URL,
})

export const fromEmail = LISTMONK_FROM_EMAIL

/** The public contact mailbox. Until it exists, the links that would write to it are hidden. */
export const contactEmail = CONTACT_EMAIL

let client: Listmonk | undefined

export function listmonk(): Listmonk {
  if (!LISTMONK_API_TOKEN) throw new Error('LISTMONK_API_TOKEN is not set')
  client ??= createListmonk({
    url: LISTMONK_URL,
    user: LISTMONK_API_USER,
    token: LISTMONK_API_TOKEN,
  })
  return client
}

/** The public launch, from LAUNCH_DATE (ISO 8601). A typo fails at start rather than hiding «Nuevo». */
const launchedAt = LAUNCH_DATE ? Date.parse(LAUNCH_DATE) : undefined
if (launchedAt !== undefined && Number.isNaN(launchedAt))
  throw new Error(`LAUNCH_DATE is not an ISO 8601 date: ${LAUNCH_DATE}`)

/** The clock the «Nuevo» badge reads, for this request. */
export function badgeClock(now = Date.now()): BadgeClock {
  return { now, launchedAt }
}
