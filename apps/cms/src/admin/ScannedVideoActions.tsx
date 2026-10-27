'use client'
import { Button, useConfig, useDocumentInfo, useFormFields, useTranslation } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { inLanguage, label } from '../labels.ts'

const text = {
  add: label('Add to the catalog', 'Añadir al catálogo'),
  again: label('Look again', 'Volver a evaluar'),
  working: label('Working…', 'Trabajando…'),
  addHelp: label(
    'Creates the short pending review, as «Add from a URL» does. The video must still be playable.',
    'Crea el corto pendiente de revisión, como «Añadir un corto desde una URL». El vídeo debe seguir pudiéndose reproducir.',
  ),
  againHelp: label(
    'The next scan of the channel judges it again with the current rules.',
    'La próxima búsqueda del canal lo juzga de nuevo con las reglas actuales.',
  ),
  queued: label(
    'Marked: the next scan judges it again.',
    'Marcado: la próxima búsqueda lo juzga de nuevo.',
  ),
  created: label('Added to the catalog: ', 'Añadido al catálogo: '),
}

/** On a scanned video's page: bring a skipped video in by hand, or ask for another look. */
export function ScannedVideoActions() {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const { id } = useDocumentInfo()
  const router = useRouter()
  const outcome = useFormFields(([fields]) => fields.outcome?.value)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ note: string; ok: boolean } | null>(null)
  const t = (key: keyof typeof text) => inLanguage(text[key], i18n.language)
  const api = `${config.serverURL}${config.routes.api}/scanned-videos/${id}`

  async function run(path: 'add' | 'reevaluate') {
    setBusy(true)
    setResult(null)
    try {
      const response = await fetch(`${api}/${path}`, { method: 'POST', credentials: 'include' })
      const body = (await response.json()) as { error?: string; title?: string }
      const note = response.ok
        ? path === 'add'
          ? `${t('created')}${body.title ?? ''}`
          : t('queued')
        : (body.error ?? String(response.status))
      setResult({ note, ok: response.ok })
      router.refresh()
    } catch (failure) {
      setResult({ note: (failure as Error).message, ok: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'calc(var(--base) / 2)', marginBottom: 'var(--base)' }}>
      <div style={{ display: 'flex', gap: 'var(--base)', flexWrap: 'wrap' }}>
        {outcome === 'skipped' ? (
          <Button buttonStyle="primary" disabled={busy} onClick={() => run('add')} margin={false}>
            {busy ? t('working') : t('add')}
          </Button>
        ) : null}
        <Button
          buttonStyle="secondary"
          disabled={busy}
          onClick={() => run('reevaluate')}
          margin={false}
        >
          {t('again')}
        </Button>
      </div>
      <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>
        {outcome === 'skipped' ? `${t('addHelp')} ` : ''}
        {t('againHelp')}
      </p>
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
