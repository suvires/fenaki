'use client'
import { Button, toast, useConfig, useTranslation } from '@payloadcms/ui'
import { useState } from 'react'
import { inLanguage, label } from '../labels.ts'

const text = {
  run: label('Approve and send', 'Aprobar y enviar'),
  sent: label('Email sent.', 'Email enviado.'),
  copy: label(
    'Email sent, but its copy could not be saved in the Sent folder:',
    'Email enviado, pero no se pudo guardar su copia en Enviados:',
  ),
}

/** Approves a draft as the signed-in admin and sends it; the server checks everything again. */
export function ApproveAndSendButton({
  id,
  disabled = false,
  retry = false,
}: {
  id: number | string
  disabled?: boolean
  retry?: boolean
}) {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try {
      const response = await fetch(
        `${config.serverURL}${config.routes.api}/messages/${id}/approve-and-send`,
        { method: 'POST', credentials: 'include' },
      )
      const body = (await response.json().catch(() => ({}))) as {
        error?: string
        sentCopyError?: string
      }
      if (!response.ok) {
        toast.error(body.error ?? String(response.status))
        setBusy(false)
        return
      }
      if (body.sentCopyError)
        toast.warning(`${inLanguage(text.copy, i18n.language)} ${body.sentCopyError}`)
      else toast.success(inLanguage(text.sent, i18n.language))
      window.location.reload()
    } catch (error) {
      toast.error((error as Error).message)
      setBusy(false)
    }
  }

  return (
    <Button
      buttonStyle="primary"
      disabled={busy || disabled}
      onClick={run}
      margin={false}
      size="medium"
    >
      {retry ? '↻ ' : ''}
      {inLanguage(text.run, i18n.language)}
    </Button>
  )
}
