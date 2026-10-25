'use client'
import { Button, toast, useConfig, useTranslation } from '@payloadcms/ui'
import { useState } from 'react'
import { inLanguage, label } from '../labels.ts'

const text = {
  run: label('Check the inbox now', 'Revisar el buzón ahora'),
  queued: label(
    'Sync queued: the jobs worker runs it within a minute. Reload this page afterwards.',
    'Sincronización en cola: el proceso de tareas la ejecuta en menos de un minuto. Recarga después esta página.',
  ),
}

export function SyncInboxButton() {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    const response = await fetch(`${config.serverURL}${config.routes.api}/messages/sync-inbox`, {
      method: 'POST',
      credentials: 'include',
    })
    setBusy(false)
    if (response.ok) toast.success(inLanguage(text.queued, i18n.language))
    else toast.error(String(response.status))
  }

  return (
    <Button buttonStyle="secondary" disabled={busy} onClick={run} margin={false}>
      {inLanguage(text.run, i18n.language)}
    </Button>
  )
}
