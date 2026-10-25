'use client'
import { Button, toast, useConfig, useTranslation } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { inLanguage, label } from '../labels.ts'

const text = {
  title: label('Add a short from a URL', 'Añadir un corto desde una URL'),
  help: label(
    'Paste a YouTube or Vimeo link. Shortix fills in what the provider knows and saves the short as pending review; nothing is published until you check the channel is official.',
    'Pega un enlace de YouTube o Vimeo. Shortix rellena lo que sabe el proveedor y guarda el corto pendiente de revisión; no se publica nada hasta que compruebes que el canal es oficial.',
  ),
  field: label('Video URL', 'URL del vídeo'),
  submit: label('Add', 'Añadir'),
  working: label('Looking it up…', 'Consultando…'),
  open: label('Open it', 'Abrirlo'),
}

/** Above the shorts list: paste a video URL and land on the new short, ready to review. */
export function AddFromUrl() {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ message: string; id?: number } | null>(null)
  const t = (key: keyof typeof text) => inLanguage(text[key], i18n.language)
  const editPath = (id: number) => `${config.routes.admin}/collections/shorts/${id}`

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`${config.serverURL}${config.routes.api}/shorts/from-url`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const body = (await response.json()) as { id?: number; title?: string; error?: string }
      if (response.ok && body.id) {
        toast.success(body.title)
        router.push(editPath(body.id))
        return
      }
      setError({ message: body.error ?? String(response.status), id: body.id })
    } catch (failure) {
      setError({ message: (failure as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'grid',
        gap: 'calc(var(--base) / 2)',
        marginBottom: 'var(--base)',
        padding: 'var(--base)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 'var(--style-radius-m)',
      }}
    >
      <h3 style={{ margin: 0 }}>{t('title')}</h3>
      <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>{t('help')}</p>
      <div style={{ display: 'flex', gap: 'calc(var(--base) / 2)', alignItems: 'center' }}>
        <label
          htmlFor="add-from-url"
          className="sr-only"
          style={{ position: 'absolute', left: -9999 }}
        >
          {t('field')}
        </label>
        <input
          id="add-from-url"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.currentTarget.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          style={{
            flex: 1,
            minHeight: 40,
            padding: '0 12px',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 'var(--style-radius-s)',
            background: 'var(--theme-input-bg)',
            color: 'var(--theme-text)',
          }}
        />
        <Button type="submit" disabled={busy} buttonStyle="primary" margin={false}>
          {busy ? t('working') : t('submit')}
        </Button>
      </div>
      {error ? (
        <p role="alert" style={{ margin: 0, color: 'var(--theme-error-500)' }}>
          {error.message} {error.id ? <a href={editPath(error.id)}>{t('open')}</a> : null}
        </p>
      ) : null}
    </form>
  )
}
