/** Server-side configuration read when the server starts (see astro.config.ts). */
import {
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
import { createListmonk, type Listmonk } from '@shortix/waitlist'
import type { SiteMode } from './site-mode.ts'

export const siteMode: SiteMode = SITE_MODE
export const siteUrl = SITE_URL
export const legalDraft = LEGAL_DRAFT

/** Cookieless analytics: loaded only when both are set. */
export const umami =
  UMAMI_SCRIPT_URL && UMAMI_WEBSITE_ID
    ? { scriptUrl: UMAMI_SCRIPT_URL, websiteId: UMAMI_WEBSITE_ID }
    : undefined

export const fromEmail = LISTMONK_FROM_EMAIL

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
