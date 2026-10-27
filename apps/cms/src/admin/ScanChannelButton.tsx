'use client'
import { Button, useConfig, useDocumentInfo, useTranslation } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { inLanguage, label } from '../labels.ts'

const text = {
  run: label('Scan for new shorts now', 'Buscar cortos nuevos ahora'),
  working: label('Scanning…', 'Buscando…'),
  help: label(
    'Adds the channel’s new shorts to the review queue. Nothing is published.',
    'Añade los cortos nuevos del canal a la cola de revisión. No se publica nada.',
  ),
}

/** On a channel's page: runs the nightly scan for this channel now and shows what it found. */
export function ScanChannelButton() {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const { id } = useDocumentInfo()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ note: string; ok: boolean } | null>(null)
  const t = (key: keyof typeof text) => inLanguage(text[key], i18n.language)

  async function run() {
    setBusy(true)
    setResult(null)
    try {
      const response = await fetch(`${config.serverURL}${config.routes.api}/channels/${id}/scan`, {
        method: 'POST',
        credentials: 'include',
      })
      const body = (await response.json()) as { note?: string; error?: string }
      setResult({ note: body.note ?? body.error ?? String(response.status), ok: response.ok })
      // The last scan fields on this page are read from the server.
      router.refresh()
    } catch (failure) {
      setResult({ note: (failure as Error).message, ok: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'calc(var(--base) / 2)', marginBottom: 'var(--base)' }}>
      <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>{t('help')}</p>
      <div>
        <Button buttonStyle="secondary" disabled={busy} onClick={run} margin={false}>
          {busy ? t('working') : t('run')}
        </Button>
      </div>
      {result ? (
        <p
          role={result.ok ? 'status' : 'alert'}
          style={{ margin: 0, color: result.ok ? undefined : 'var(--theme-error-500)' }}
        >
          {result.note}
        </p>
      ) : null}
    </div>
  )
}
