import type { APIRoute } from 'astro'
import { localeFrom } from '../../../../lib/i18n.ts'
import { ogResponse, renderOgImage } from '../../../../lib/og.ts'
import { documentCard, type OgKind } from '../../../../lib/og-cards.ts'

const KINDS: OgKind[] = ['cortos', 'personas', 'colecciones', 'salas']

/** /og/es/cortos/<slug>.png and the same for people, collections and showcases. */
export const GET: APIRoute = async ({ params }) => {
  const locale = localeFrom(params.locale)
  const kind = KINDS.find((k) => k === params.kind)
  if (!locale || !kind || !params.slug) return new Response(null, { status: 404 })
  const card = await documentCard(locale, kind, params.slug)
  if (!card) return new Response(null, { status: 404 })
  return ogResponse(await renderOgImage(card))
}
