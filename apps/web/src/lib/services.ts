/** Server-side configuration read when the server starts (see astro.config.ts). */
import {
  CMS_PUBLIC_URL,
  CMS_URL,
  CONTACT_EMAIL,
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
