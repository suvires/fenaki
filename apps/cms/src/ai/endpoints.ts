import type { Endpoint } from 'payload'
import { isAdminUser } from '../access.ts'
import { inLanguage, label } from '../labels.ts'
import { aiConfigured, analyzeShort, applyReview } from './review.ts'

const errors = {
  unauthorized: label('Sign in to do this.', 'Inicia sesión para hacerlo.'),
  off: label(
    'The AI analysis is off: ANTHROPIC_API_KEY is not set in the CMS environment.',
    'El análisis con IA está desactivado: falta ANTHROPIC_API_KEY en el entorno del CMS.',
  ),
  missing: label(
    'This short has no source to analyse.',
    'Este corto no tiene una fuente que analizar.',
  ),
  noProposal: label('There is no proposal to apply yet.', 'Todavía no hay propuesta que aplicar.'),
  unavailable: label(
    'The AI service did not answer. Try again in a few minutes.',
    'El servicio de IA no ha respondido. Prueba de nuevo en unos minutos.',
  ),
}

const fail = (key: keyof typeof errors, status: number, language: string | undefined) =>
  Response.json({ error: inLanguage(errors[key], language) }, { status })

/** POST /api/shorts/:id/analyze: «Analizar con IA», one normal request for this short. */
export const analyzeShortEndpoint: Endpoint = {
  path: '/:id/analyze',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!isAdminUser(req.user)) return fail('unauthorized', 401, language)
    if (!aiConfigured()) return fail('off', 503, language)
    try {
      const reviewed = await analyzeShort(req, Number(req.routeParams?.id))
      if (!reviewed) return fail('missing', 404, language)
      return Response.json({ ok: true, result: reviewed.kind })
    } catch {
      return fail('unavailable', 502, language)
    }
  },
}

/** POST /api/shorts/:id/apply-ai: «Aplicar propuesta», copies the proposal into empty fields. */
export const applyReviewEndpoint: Endpoint = {
  path: '/:id/apply-ai',
  method: 'post',
  handler: async (req) => {
    const language = req.i18n?.language
    if (!isAdminUser(req.user)) return fail('unauthorized', 401, language)
    const applied = await applyReview(req, Number(req.routeParams?.id))
    if (!applied) return fail('noProposal', 409, language)
    return Response.json({ ok: true, applied })
  },
}
