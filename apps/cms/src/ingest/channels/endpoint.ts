import type { Endpoint } from 'payload'
import { isAdminUser } from '../../access.ts'
import { inLanguage, label } from '../../labels.ts'
import { queueChannelScan } from '../../jobs/queue.ts'
import { runChannelScan } from './scan.ts'
import { SKIP_REASONS } from './rules.ts'

const errors = {
  unauthorized: label('Sign in to scan channels.', 'Inicia sesión para buscar en los canales.'),
  missing: label('This channel does not exist.', 'Este canal no existe.'),
}

/** POST /api/channels/:id/scan: scans one channel now, for the button on the channel's page. */
export const scanChannelEndpoint: Endpoint = {
  path: '/:id/scan',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!isAdminUser(req.user))
      return Response.json({ error: inLanguage(errors.unauthorized, language) }, { status: 401 })
    const channel = await req.payload
      .findByID({ collection: 'channels', id: String(req.routeParams?.id), depth: 0, req })
      .catch(() => null)
    if (!channel)
      return Response.json({ error: inLanguage(errors.missing, language) }, { status: 404 })
    // A web request cannot read a whole backlog; the nightly job continues where this stops.
    const result = await runChannelScan(req, channel, fetch, undefined, { maxVideos: 150 })
    return Response.json(
      { ok: result.ok, note: result.note, ...(result.ok ? { added: result.added } : {}) },
      { status: result.ok ? 200 : 502 },
    )
  },
}

const queued = label(
  'Queued: the jobs worker scans the channel in a few minutes. Reload to see the result.',
  'En cola: el proceso de tareas revisa el canal en unos minutos. Recarga para ver el resultado.',
)

async function channelOf(req: Parameters<NonNullable<Endpoint['handler']>>[0]) {
  return req.payload
    .findByID({ collection: 'channels', id: String(req.routeParams?.id), depth: 0, req })
    .catch(() => null)
}

/** POST /api/channels/:id/rescan: «Revisar todo el canal» — flags the channel and queues its scan. */
export const rescanChannelEndpoint: Endpoint = {
  path: '/:id/rescan',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!isAdminUser(req.user))
      return Response.json({ error: inLanguage(errors.unauthorized, language) }, { status: 401 })
    const channel = await channelOf(req)
    if (!channel)
      return Response.json({ error: inLanguage(errors.missing, language) }, { status: 404 })
    await req.payload.update({
      collection: 'channels',
      id: channel.id,
      data: { rescanAll: true, backlogCursor: null },
      req,
    })
    await queueChannelScan(req, channel.id)
    return Response.json({ ok: true, note: inLanguage(queued, language) })
  },
}

/**
 * POST /api/channels/:id/reevaluate with `{ "reasons": ["too-short", …] }`: the skipped videos of
 * the channel with those reasons (all but duplicates when left out) are judged again with the
 * current rules and catalog languages, and the scan is queued.
 */
export const reevaluateChannelEndpoint: Endpoint = {
  path: '/:id/reevaluate',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!isAdminUser(req.user))
      return Response.json({ error: inLanguage(errors.unauthorized, language) }, { status: 401 })
    const channel = await channelOf(req)
    if (!channel)
      return Response.json({ error: inLanguage(errors.missing, language) }, { status: 404 })
    const body = (await req.json?.().catch(() => ({}))) as { reasons?: unknown } | undefined
    const asked = Array.isArray(body?.reasons)
      ? body.reasons.filter((reason): reason is string => typeof reason === 'string')
      : []
    const reasons = (
      asked.length > 0 ? asked : SKIP_REASONS.filter((r) => r !== 'duplicate')
    ).filter((reason) => reason !== 'failed')
    const marked = await req.payload.update({
      collection: 'scanned-videos',
      where: {
        channel: { equals: channel.id },
        outcome: { equals: 'skipped' },
        skipReason: { in: reasons },
      },
      data: { reevaluate: true },
      req,
    })
    await queueChannelScan(req, channel.id)
    return Response.json({
      ok: true,
      marked: marked.docs.length,
      note: inLanguage(queued, language),
    })
  },
}
