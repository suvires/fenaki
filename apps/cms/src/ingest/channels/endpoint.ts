import type { Endpoint } from 'payload'
import { isAdminUser } from '../../access.ts'
import { inLanguage, label } from '../../labels.ts'
import { runChannelScan } from './scan.ts'

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
    const result = await runChannelScan(req, channel)
    return Response.json(
      { ok: result.ok, note: result.note, ...(result.ok ? { added: result.added } : {}) },
      { status: result.ok ? 200 : 502 },
    )
  },
}
