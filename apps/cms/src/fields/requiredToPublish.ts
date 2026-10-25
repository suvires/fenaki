import type { PayloadRequest } from 'payload'
import { inLanguage, messages } from '../labels.ts'

/**
 * A value a short needs before it is published, but not while it waits for review: a short
 * added from a URL may not know its running time or type yet.
 */
export function requiredToPublish(
  value: unknown,
  { data, req }: { data: unknown; req: PayloadRequest },
): string | true {
  const status = (data as { status?: string } | undefined)?.status
  const empty = value === null || value === undefined || value === ''
  if (status === 'published' && empty)
    return inLanguage(messages.requiredToPublish, req.i18n?.language)
  return true
}
