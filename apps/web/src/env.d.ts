/// <reference types="astro/client" />
import type { SessionMember } from './lib/account/session.ts'

declare global {
  namespace App {
    interface Locals {
      /** The signed-in viewer, resolved once per request by the middleware (lib/account/session.ts). */
      member?: SessionMember
    }
  }
}
