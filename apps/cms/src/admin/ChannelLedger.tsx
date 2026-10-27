'use client'
import { Button, useConfig, useDocumentInfo, useTranslation } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { skipReasonLabels } from '../ingest/channels/reasonLabels.ts'
import { inLanguage, label } from '../labels.ts'

const text = {
  title: label('What the scans found', 'Lo que han encontrado las búsquedas'),
  added: label('Added to the catalog', 'Añadidos al catálogo'),
  skipped: label('Skipped', 'Descartados'),
  empty: label('No video has been scanned yet.', 'Todavía no se ha escaneado ningún vídeo.'),
  again: label('Look again', 'Volver a evaluar'),
  rescan: label('Review the whole channel', 'Revisar todo el canal'),
  rescanHelp: label(
    'Reads the channel from its newest video to its first. What the scanned videos already settled is skipped, so it is cheap to repeat.',
    'Lee el canal desde su vídeo más reciente hasta el primero. Lo que ya resolvieron los vídeos escaneados se salta, así que es barato repetirlo.',
  ),
  againHelp: label(
    'After changing the duration range or the catalog languages, a reason can be judged again with the new rules.',
    'Tras cambiar el rango de duración o los idiomas del catálogo, se puede juzgar de nuevo un motivo con las reglas nuevas.',
  ),
  working: label('Working…', 'Trabajando…'),
}

interface Counts {
  added: number
  skipped: number
  reasons: Record<string, number>
}

/** On a channel's page: how many videos the scans added and skipped, and why, with the actions. */
export function ChannelLedger() {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const { id } = useDocumentInfo()
  const router = useRouter()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const t = (key: keyof typeof text) => inLanguage(text[key], i18n.language)
  const api = `${config.serverURL}${config.routes.api}/channels/${id}`

  // Bumped after an action, so the counts are read again.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetch(`${api}/ledger`, { credentials: 'include' })
      .then((response) => (response.ok ? (response.json() as Promise<Counts>) : null))
      .then((body) => {
        if (body && !cancelled) setCounts(body)
      })
    return () => {
      cancelled = true
    }
  }, [api, version])

  async function post(path: string, body?: unknown) {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`${api}/${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      })
      const result = (await response.json()) as { note?: string; error?: string }
      setMessage(result.note ?? result.error ?? String(response.status))
      router.refresh()
      setVersion((current) => current + 1)
    } catch (failure) {
      setMessage((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reasons = Object.entries(counts?.reasons ?? {})
  return (
    <div style={{ display: 'grid', gap: 'calc(var(--base) / 2)', marginBottom: 'var(--base)' }}>
      <strong>{t('title')}</strong>
      {counts && counts.added + counts.skipped === 0 ? (
        <p style={{ margin: 0 }}>{t('empty')}</p>
      ) : null}
      {counts ? (
        <ul style={{ margin: 0, paddingLeft: 'var(--base)', display: 'grid', gap: 4 }}>
          <li>
            {t('added')}: <strong>{counts.added}</strong>
          </li>
          <li>
            {t('skipped')}: <strong>{counts.skipped}</strong>
            <ul style={{ paddingLeft: 'var(--base)', display: 'grid', gap: 4, marginTop: 4 }}>
              {reasons.map(([reason, total]) => {
                const known = skipReasonLabels[reason as keyof typeof skipReasonLabels]
                return (
                  <li key={reason}>
                    {known ? inLanguage(known, i18n.language) : reason}: <strong>{total}</strong>{' '}
                    {reason !== 'duplicate' && reason !== 'failed' ? (
                      <Button
                        buttonStyle="none"
                        size="small"
                        disabled={busy}
                        onClick={() => post('reevaluate', { reasons: [reason] })}
                      >
                        {t('again')}
                      </Button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </li>
        </ul>
      ) : null}
      <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>{t('againHelp')}</p>
      <div>
        <Button
          buttonStyle="secondary"
          disabled={busy}
          onClick={() => post('rescan')}
          margin={false}
        >
          {busy ? t('working') : t('rescan')}
        </Button>
      </div>
      <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>{t('rescanHelp')}</p>
      {message ? (
        <p role="status" style={{ margin: 0 }}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
