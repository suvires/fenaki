/**
 * What the CMS' answer means for the site, without Astro, so tests can use it. The routes answer
 * the browser with these outcomes and nothing the CMS said: whether an email has an account is
 * never revealed.
 */

type PayloadErrors = { errors?: { name?: string; data?: { errors?: { path?: string }[] } }[] }

/** Payload refuses to create an account for an email that already has one (a validation error on `email`). */
export function isEmailTaken(data: unknown): boolean {
  const errors = (data as PayloadErrors | undefined)?.errors
  return Boolean(
    errors?.some((error) => error.data?.errors?.some((field) => field.path === 'email')),
  )
}

/**
 * Sign-up. A new account and an existing one look the same to the visitor («Si hay una cuenta con
 * ese correo, te hemos enviado un enlace»); for an existing one the route asks for a new
 * verification link in case it was never verified.
 */
export function signupOutcome(status: number, data: unknown): 'created' | 'existing' | 'server' {
  if (status >= 200 && status < 300) return 'created'
  if (status === 400 && isEmailTaken(data)) return 'existing'
  return 'server'
}

/**
 * Sign-in. Payload answers 403 only after the password was right (the account is not verified
 * yet), and 401 for a wrong password, an unknown email and a locked account alike.
 */
export function loginOutcome(status: number): 'ok' | 'invalid' | 'unverified' | 'server' {
  if (status === 200) return 'ok'
  if (status === 401 || status === 400) return 'invalid'
  if (status === 403) return 'unverified'
  return 'server'
}

/** A verification or reset token that does not work (wrong, used or expired) is a client problem. */
export function tokenOutcome(status: number): 'ok' | 'invalid_token' | 'server' {
  if (status >= 200 && status < 300) return 'ok'
  if (status >= 400 && status < 500) return 'invalid_token'
  return 'server'
}

/** Tokens in the emails are hexadecimal; anything else is refused before asking the CMS. */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,200}$/.test(value)
}
