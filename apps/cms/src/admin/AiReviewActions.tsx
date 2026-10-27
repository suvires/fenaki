'use client'
import { Button, useConfig, useDocumentInfo, useFormFields, useTranslation } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { inLanguage, label } from '../labels.ts'

const text = {
  analyze: label('Analyze with AI', 'Analizar con IA'),
  apply: label('Apply proposal', 'Aplicar propuesta'),
  working: label('Working…', 'Trabajando…'),
  help: label(
    'Asks Claude about this short. «Apply proposal» copies the proposal into the fields that are still empty; it never replaces what an editor wrote and publishes nothing.',
    'Pregunta a Claude por este corto. «Aplicar propuesta» copia la propuesta en los campos que sigan vacíos; nunca sustituye lo que escribió un editor y no publica nada.',
  ),
  analyzed: label(
    'Analysed. Reload to see the proposal.',
    'Analizado. Recarga para ver la propuesta.',
  ),
  applied: label('Applied: ', 'Aplicado: '),
  nothing: label('nothing was empty.', 'no había nada vacío.'),
}

/** In «Propuesta de la IA»: ask for the analysis now, or copy the proposal into the empty fields. */
export function AiReviewActions() {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const { id } = useDocumentInfo()
  const router = useRouter()
  const status = useFormFields(([fields]) => fields['aiReview.status']?.value)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ note: string; ok: boolean } | null>(null)
  const t = (key: keyof typeof text) => inLanguage(text[key], i18n.language)
  const api = `${config.serverURL}${config.routes.api}/shorts/${id}`

  async function run(path: 'analyze' | 'apply-ai') {
    setBusy(true)
    setResult(null)
    try {
      const response = await fetch(`${api}/${path}`, { method: 'POST', credentials: 'include' })
      const body = (await response.json()) as { error?: string; applied?: string[] }
      const note = !response.ok
        ? (body.error ?? String(response.status))
        : path === 'analyze'
          ? t('analyzed')
          : `${t('applied')}${body.applied?.length ? body.applied.join(', ') : t('nothing')}`
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
        <Button
          buttonStyle="secondary"
          disabled={busy}
          onClick={() => run('analyze')}
          margin={false}
        >
          {busy ? t('working') : t('analyze')}
        </Button>
        {status === 'analyzed' ? (
          <Button
            buttonStyle="primary"
            disabled={busy}
            onClick={() => run('apply-ai')}
            margin={false}
          >
            {t('apply')}
          </Button>
        ) : null}
      </div>
      <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>{t('help')}</p>
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
