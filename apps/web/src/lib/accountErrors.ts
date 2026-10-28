import type { MessageKey } from '@fenaki/i18n'

/** The text for an error code of the account routes. Unknown codes are a server problem. */
export function errorKey(code: string | undefined): MessageKey {
  switch (code) {
    case 'email_empty':
      return 'account.common.error.emailEmpty'
    case 'email_invalid':
      return 'account.common.error.email'
    case 'email_taken':
      return 'account.common.error.emailTaken'
    case 'email_same':
      return 'account.common.error.emailSame'
    case 'password_empty':
      return 'account.common.error.passwordEmpty'
    case 'password_short':
      return 'account.common.error.passwordShort'
    case 'password_long':
      return 'account.common.error.passwordLong'
    case 'rate_limited':
      return 'account.common.error.rateLimited'
    case 'network':
      return 'account.common.error.network'
    case 'signed_out':
      return 'account.common.error.session'
    default:
      return 'account.common.error.server'
  }
}

/** Codes about one field of a form, shown under it; the rest go in a notice. */
export function fieldOf(code: string | undefined): 'email' | 'password' | undefined {
  if (code?.startsWith('email_')) return 'email'
  if (code?.startsWith('password_')) return 'password'
  return undefined
}
