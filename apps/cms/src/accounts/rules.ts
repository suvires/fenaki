/** Rules for viewer accounts that the CMS enforces itself, whoever calls its API. */

/** Shortest password a viewer can choose. The site's forms check the same number. */
export const MIN_PASSWORD_LENGTH = 10

/** A viewer signs in for 30 days; the site refreshes the token before it runs out. */
export const SESSION_SECONDS = 30 * 24 * 60 * 60

export const MAX_LOGIN_ATTEMPTS = 5
/** Milliseconds an account stays locked after too many failed attempts. */
export const LOCK_TIME_MS = 15 * 60 * 1000

/** A password-reset link works for one hour (Payload's default, stated in the email). */
export const RESET_LINK_MINUTES = 60

/** At most this many items per member in each list, so an account cannot grow without bound. */
export const MAX_LIST_ITEMS = 200
export const MAX_RATINGS = 1000
export const MAX_VIEWINGS = 1000

/** A viewing is completed from this share of the duration. */
export const COMPLETED_FROM = 0.9
