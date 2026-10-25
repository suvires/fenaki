import config from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

/**
 * Health check for kamal-proxy (during deploys) and the external uptime monitor: answers 200 only
 * when Payload is initialised and PostgreSQL answers.
 */
export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    await payload.db.pool.query('SELECT 1')
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json(
      { status: 'error' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
