import type { Endpoint } from 'payload'
import { isAdminUser } from '../access.ts'

/** POST /api/sources/check-embeds: queues an embed check now, for the problems view. */
export const checkEmbedsEndpoint: Endpoint = {
  path: '/check-embeds',
  method: 'post',
  handler: async (req) => {
    if (!isAdminUser(req.user)) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const pending = await req.payload.count({
      collection: 'payload-jobs',
      where: { taskSlug: { equals: 'checkEmbeds' }, completedAt: { exists: false } },
      req,
    })
    if (pending.totalDocs === 0)
      await req.payload.jobs.queue({ task: 'checkEmbeds', input: {}, req })
    return Response.json({ queued: true }, { status: 202 })
  },
}
