'use client'
import { useConfig, useFormFields, useTranslation } from '@payloadcms/ui'
import { useEffect, useMemo, useState } from 'react'
import { inLanguage, label } from '../labels.ts'

const text = {
  title: label('Preview', 'Vista previa'),
  count: label('shorts match these filters.', 'cortos cumplen estos filtros.'),
  first: label('First in the home rail:', 'Primeros en la fila de la portada:'),
  empty: label(
    'No published short matches: the collection would not show.',
    'Ningún corto publicado los cumple: la colección no se mostraría.',
  ),
  failed: label('The preview could not be loaded.', 'No se pudo cargar la vista previa.'),
}

/** The filters being edited, as the preview endpoint reads them. */
function useDraft() {
  const fields = useFormFields(([state]) => state)
  return useMemo(() => {
    const rules: Record<string, unknown> = {}
    for (const [path, field] of Object.entries(fields))
      if (path.startsWith('rules.')) rules[path.slice('rules.'.length)] = field?.value
    return {
      rules,
      sort: fields.sort?.value,
      pinned: fields.pinned?.value,
      excluded: fields.excluded?.value,
    }
  }, [fields])
}

/**
 * Under the filters of a collection: how many published shorts they give and the first ones, as
 * they are edited, so a collection is never published empty or odd.
 */
export function CollectionPreview() {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const t = (key: keyof typeof text) => inLanguage(text[key], i18n.language)
  const draft = useDraft()
  const body = JSON.stringify(draft)
  const [result, setResult] = useState<{ total: number; titles: string[] } | 'failed'>()

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`${config.serverURL}${config.routes.api}/collections/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(String(response.status))
          setResult((await response.json()) as { total: number; titles: string[] })
        })
        .catch((error: unknown) => {
          if ((error as Error).name !== 'AbortError') setResult('failed')
        })
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [body, config.serverURL, config.routes.api])

  return (
    <div style={{ display: 'grid', gap: 'calc(var(--base) / 2)', marginBottom: 'var(--base)' }}>
      <strong>{t('title')}</strong>
      {result === 'failed' ? (
        <p style={{ margin: 0 }}>{t('failed')}</p>
      ) : result === undefined ? null : result.total === 0 ? (
        <p style={{ margin: 0 }}>{t('empty')}</p>
      ) : (
        <>
          <p style={{ margin: 0 }}>
            {new Intl.NumberFormat(i18n.language).format(result.total)} {t('count')}
          </p>
          <p style={{ margin: 0 }}>
            {t('first')} {result.titles.join(' · ')}
          </p>
        </>
      )}
    </div>
  )
}
