import type { Endpoint } from 'payload'
import { isAdminUser, isStaffUser } from '../access.ts'
import { inLanguage } from '../labels.ts'
import { CrmError, crmErrors } from './errors.ts'
import { sendApprovedMessage } from './send.ts'

const fail = (code: keyof typeof crmErrors, status: number, language?: string) =>
  Response.json({ error: inLanguage(crmErrors[code], language), code }, { status })

/**
 * POST /api/messages/:id/approve-and-send, for admins: approves a draft (through the approval
 * gate, as the signed-in admin) and sends it. An already approved message is sent as is, which
 * is how a failed send is retried.
 */
export const approveAndSendEndpoint: Endpoint = {
  path: '/:id/approve-and-send',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!req.user) return fail('anonymous', 401, language)
    if (!isAdminUser(req.user)) return fail('forbidden', 403, language)
    const id = Number(req.routeParams?.id)
    if (!Number.isInteger(id)) return fail('notFound', 404, language)
    try {
      const message = await req.payload
        .findByID({ collection: 'messages', id, depth: 0, overrideAccess: true })
        .catch(() => null)
      if (!message) return fail('notFound', 404, language)
      if (message.status === 'draft' || message.status === 'failed')
        await req.payload.update({
          collection: 'messages',
          id,
          data: { status: 'approved' },
          user: req.user,
          overrideAccess: false,
        })
      const result = await sendApprovedMessage(id, { payload: req.payload, user: req.user })
      return Response.json({ sent: true, ...result })
    } catch (error) {
      if (error instanceof CrmError) {
        const detail = error.message.slice(crmErrors[error.code].en.length).trim()
        return Response.json(
          {
            error: `${inLanguage(crmErrors[error.code], language)}${detail ? ` ${detail}` : ''}`,
            code: error.code,
          },
          { status: error.status },
        )
      }
      return Response.json(
        { error: (error as Error).message ?? 'error' },
        { status: (error as { status?: number }).status ?? 500 },
      )
    }
  },
}

/** POST /api/messages/sync-inbox: queues an inbox sync now, for the «Today» view. */
export const syncInboxEndpoint: Endpoint = {
  path: '/sync-inbox',
  method: 'post',
  handler: async (req) => {
    if (!isStaffUser(req.user)) return fail('forbidden', 403, req.i18n?.language)
    const pending = await req.payload.count({
      collection: 'payload-jobs',
      where: { taskSlug: { equals: 'syncInbox' }, completedAt: { exists: false } },
      req,
    })
    if (pending.totalDocs === 0) await req.payload.jobs.queue({ task: 'syncInbox', input: {}, req })
    return Response.json({ queued: true }, { status: 202 })
  },
}
