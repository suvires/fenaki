import type { Endpoint } from 'payload'
import { isAdminUser, isStaffAccount } from '../../access.ts'
import { inLanguage, label } from '../../labels.ts'
import { addFromUrlErrors, addShortFromUrl } from '../addFromUrl.ts'
import { ledgerCounts } from './ledger.ts'

const errors = {
  unauthorized: label('Sign in to do this.', 'Inicia sesión para hacerlo.'),
  missing: label('This video does not exist.', 'Este vídeo no existe.'),
  added: label('It is already in the catalog.', 'Ya está en el catálogo.'),
}

const fail = (key: keyof typeof errors, status: number, language: string | undefined) =>
  Response.json({ error: inLanguage(errors[key], language) }, { status })

/** POST /api/scanned-videos/:id/add: brings a skipped video in by hand, as «Add from a URL» does. */
export const addScannedVideoEndpoint: Endpoint = {
  path: '/:id/add',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!isAdminUser(req.user)) return fail('unauthorized', 401, language)
    const row = await req.payload
      .findByID({ collection: 'scanned-videos', id: String(req.routeParams?.id), depth: 0, req })
      .catch(() => null)
    if (!row) return fail('missing', 404, language)
    if (row.outcome === 'added') return fail('added', 409, language)
    const url =
      row.url ||
      (row.provider === 'youtube'
        ? `https://www.youtube.com/watch?v=${row.externalId}`
        : `https://vimeo.com/${row.externalId}`)
    const result = await addShortFromUrl(req, url)
    if (!result.ok) {
      return Response.json(
        { error: inLanguage(addFromUrlErrors[result.error], language), id: result.shortId },
        { status: result.status },
      )
    }
    return Response.json({ id: result.shortId, title: result.title }, { status: 201 })
  },
}

/** POST /api/scanned-videos/:id/reevaluate: the next scan of its channel judges it again. */
export const reevaluateScannedVideoEndpoint: Endpoint = {
  path: '/:id/reevaluate',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!isAdminUser(req.user)) return fail('unauthorized', 401, language)
    const row = await req.payload
      .findByID({ collection: 'scanned-videos', id: String(req.routeParams?.id), depth: 0, req })
      .catch(() => null)
    if (!row) return fail('missing', 404, language)
    await req.payload.update({
      collection: 'scanned-videos',
      id: row.id,
      data: { reevaluate: true },
      req,
    })
    return Response.json({ ok: true })
  },
}

/** GET /api/channels/:id/ledger: counts by outcome and skip reason, for the channel's page. */
export const channelLedgerEndpoint: Endpoint = {
  path: '/:id/ledger',
  method: 'get',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!isStaffAccount(req.user)) return fail('unauthorized', 401, language)
    return Response.json(await ledgerCounts(req, Number(req.routeParams?.id)))
  },
}
