'use client'
import { useAuth, useDocumentInfo, useFormFields, useFormModified } from '@payloadcms/ui'
import { useTranslation } from '@payloadcms/ui'
import { inLanguage, label } from '../labels.ts'
import { ApproveAndSendButton } from './ApproveAndSendButton.tsx'

const text = {
  save: label(
    'Save your changes first: the email sent is the saved one.',
    'Guarda primero tus cambios: se envía el email guardado.',
  ),
  waiting: label(
    'Waiting for an admin to approve and send it.',
    'A la espera de que un administrador lo apruebe y lo envíe.',
  ),
}

/** The «Approve and send» button on the message screen, for admins, on unsent outbound messages. */
export function ApproveAndSendField() {
  const { id } = useDocumentInfo()
  const { user } = useAuth()
  const modified = useFormModified()
  const { i18n } = useTranslation()
  const status = useFormFields(([fields]) => fields.status?.value as string | undefined)
  const direction = useFormFields(([fields]) => fields.direction?.value as string | undefined)
  const role = (user as { role?: string } | null)?.role

  if (!id || direction !== 'outbound') return null
  if (status !== 'draft' && status !== 'approved' && status !== 'failed') return null
  return (
    <div style={{ marginBottom: 'var(--base)', display: 'grid', gap: 'calc(var(--base) / 2)' }}>
      {role === 'admin' ? (
        <>
          <div>
            <ApproveAndSendButton id={id} disabled={modified} retry={status !== 'draft'} />
          </div>
          {modified ? <small>{inLanguage(text.save, i18n.language)}</small> : null}
        </>
      ) : (
        <small>{inLanguage(text.waiting, i18n.language)}</small>
      )}
    </div>
  )
}
