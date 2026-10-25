import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { isAdminUser, isStaffUser } from '../access.ts'
import { MESSAGE_STATUSES, PIPELINE, type PipelineStatus } from '../crm/constants.ts'
import { startOfDay } from '../crm/limits.ts'
import { inLanguage, label, type AdminLabel } from '../labels.ts'
import type { Contact, Message, Organization } from '../payload-types.ts'
import { ApproveAndSendButton } from './ApproveAndSendButton.tsx'
import { SyncInboxButton } from './SyncInboxButton.tsx'

const text = {
  title: label('Today', 'Hoy'),
  intro: label(
    'What needs a person today: drafts to approve, replies to read and follow-ups that are due.',
    'Lo que necesita a una persona hoy: borradores por aprobar, respuestas por leer y seguimientos que tocan.',
  ),
  drafts: label('Waiting for approval', 'Pendientes de aprobar'),
  replies: label('New replies', 'Respuestas nuevas'),
  followUps: label('Follow-ups due', 'Seguimientos que tocan'),
  pipeline: label('Pipeline', 'Embudo'),
  none: label('Nothing here.', 'Nada por aquí.'),
  to: label('To', 'Para'),
  from: label('From', 'De'),
  organization: label('Organization', 'Organización'),
  nextFollowUp: label('Follow-up', 'Seguimiento'),
  status: label('Status', 'Estado'),
  lastContact: label('Last contact', 'Último contacto'),
  inbox: label('Inbox sync', 'Sincronización del buzón'),
  lastRun: label('Last run', 'Última ejecución'),
  never: label('never', 'nunca'),
  off: label(
    'Off: the MAILBOX_* settings are empty.',
    'Desactivada: los ajustes MAILBOX_* están vacíos.',
  ),
  failedWith: label('Last run failed:', 'La última ejecución falló:'),
  sendLimit: label('Sent today', 'Enviados hoy'),
  agentNote: label(
    'Only an admin can approve and send.',
    'Solo un administrador puede aprobar y enviar.',
  ),
} satisfies Record<string, AdminLabel>

/** /admin/today: the sales CRM's daily view. Bodies are shown as text, never as HTML. */
export async function Today({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect(`${req.payload.config.routes.admin}/login`)
  if (!isStaffUser(req.user)) redirect(`${req.payload.config.routes.admin}`)
  const language = req.i18n.language
  const t = (key: keyof typeof text) => inLanguage(text[key], language)
  const admin = req.payload.config.routes.admin
  const canSend = isAdminUser(req.user)
  const date = (value: string | null | undefined) =>
    value ? new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(value)) : '—'
  const dateTime = (value: string | null | undefined) =>
    value
      ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(value),
        )
      : t('never')
  const now = new Date()
  const dayStart = startOfDay(now)
  const endOfToday = startOfDay(new Date(dayStart.getTime() + 25 * 60 * 60 * 1000))
  const statuses = Object.keys(PIPELINE) as PipelineStatus[]

  const [drafts, replies, followUps, counts, inbox, sentToday] = await Promise.all([
    req.payload.find({
      collection: 'messages',
      where: { direction: { equals: 'outbound' }, status: { in: ['draft', 'approved', 'failed'] } },
      sort: 'createdAt',
      depth: 1,
      limit: 0,
      pagination: false,
      req,
    }),
    req.payload.find({
      collection: 'messages',
      where: { direction: { equals: 'inbound' }, handled: { not_equals: true } },
      sort: '-receivedAt',
      depth: 1,
      limit: 0,
      pagination: false,
      req,
    }),
    req.payload.find({
      collection: 'organizations',
      where: {
        nextFollowUpDate: { less_than: endOfToday.toISOString() },
        status: { in: ['contacted', 'replied', 'proposal', 'negotiation'] },
      },
      sort: 'nextFollowUpDate',
      depth: 0,
      limit: 0,
      pagination: false,
      req,
    }),
    Promise.all(
      statuses.map((status) =>
        req.payload.count({
          collection: 'organizations',
          where: { status: { equals: status } },
          req,
        }),
      ),
    ),
    req.payload.findGlobal({ slug: 'crm-inbox', depth: 0, req }),
    req.payload.count({
      collection: 'messages',
      where: {
        direction: { equals: 'outbound' },
        status: { in: ['sent', 'sending'] },
        sentAt: { greater_than_equal: dayStart.toISOString() },
      },
      req,
    }),
  ])
  const imapOn = Boolean(process.env.MAILBOX_IMAP_HOST && process.env.MAILBOX_USER)
  const organizationLink = (value: number | Organization) =>
    typeof value === 'object' ? (
      <a href={`${admin}/collections/organizations/${value.id}`}>{value.name}</a>
    ) : (
      <a href={`${admin}/collections/organizations/${value}`}>#{value}</a>
    )
  const contactEmail = (value: number | Contact | null | undefined) =>
    value && typeof value === 'object' ? value.email : ''
  const excerpt = (message: Message) =>
    message.body.length > 400 ? `${message.body.slice(0, 400)}…` : message.body
  const bodyStyle = { margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const
  const cardStyle = {
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: 'var(--style-radius-m)',
    padding: 'var(--base)',
    display: 'grid',
    gap: 'calc(var(--base) / 2)',
  } as const

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <div style={{ display: 'grid', gap: 'var(--base)', paddingBlock: 'var(--base)' }}>
          <h1 style={{ margin: 0 }}>{t('title')}</h1>
          <p style={{ margin: 0, maxWidth: '70ch' }}>{t('intro')}</p>
          {canSend ? null : <p style={{ margin: 0 }}>{t('agentNote')}</p>}

          <h2 style={{ margin: 0 }}>
            {t('drafts')} ({drafts.totalDocs})
          </h2>
          {drafts.docs.length === 0 ? <p>{t('none')}</p> : null}
          {drafts.docs.map((message) => (
            <div key={message.id} style={cardStyle} data-testid="draft">
              <strong>
                <a href={`${admin}/collections/messages/${message.id}`}>{message.subject}</a>
              </strong>
              <small>
                {t('to')}: {contactEmail(message.contact)} ·{' '}
                {organizationLink(message.organization)} ·{' '}
                {inLanguage(MESSAGE_STATUSES[message.status], language)}
                {message.error ? ` · ${message.error}` : ''}
              </small>
              <p style={bodyStyle}>{excerpt(message)}</p>
              {canSend ? (
                <div>
                  <ApproveAndSendButton id={message.id} retry={message.status !== 'draft'} />
                </div>
              ) : null}
            </div>
          ))}

          <h2 style={{ margin: 0 }}>
            {t('replies')} ({replies.totalDocs})
          </h2>
          {replies.docs.length === 0 ? <p>{t('none')}</p> : null}
          {replies.docs.map((message) => (
            <div key={message.id} style={cardStyle} data-testid="reply">
              <strong>
                <a href={`${admin}/collections/messages/${message.id}`}>{message.subject}</a>
              </strong>
              <small>
                {t('from')}: {contactEmail(message.contact)} ·{' '}
                {organizationLink(message.organization)} · {dateTime(message.receivedAt)}
              </small>
              <p style={bodyStyle}>{excerpt(message)}</p>
            </div>
          ))}

          <h2 style={{ margin: 0 }}>
            {t('followUps')} ({followUps.totalDocs})
          </h2>
          {followUps.docs.length === 0 ? (
            <p>{t('none')}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('organization')}</th>
                  <th>{t('status')}</th>
                  <th>{t('nextFollowUp')}</th>
                  <th>{t('lastContact')}</th>
                </tr>
              </thead>
              <tbody>
                {followUps.docs.map((organization) => (
                  <tr key={organization.id}>
                    <td>{organizationLink(organization)}</td>
                    <td>{inLanguage(PIPELINE[organization.status], language)}</td>
                    <td>{date(organization.nextFollowUpDate)}</td>
                    <td>{date(organization.lastContactDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 style={{ margin: 0 }}>{t('pipeline')}</h2>
          <table className="table">
            <tbody>
              {statuses.map((status, index) => (
                <tr key={status}>
                  <td>
                    <a href={`${admin}/collections/organizations?where[status][equals]=${status}`}>
                      {inLanguage(PIPELINE[status], language)}
                    </a>
                  </td>
                  <td>{counts[index]?.totalDocs ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ margin: 0 }}>{t('inbox')}</h2>
          <p style={{ margin: 0 }}>
            {imapOn ? `${t('lastRun')}: ${dateTime(inbox.lastRunAt)}` : t('off')}
            {inbox.lastError ? ` · ${t('failedWith')} ${inbox.lastError}` : ''} · {t('sendLimit')}:{' '}
            {sentToday.totalDocs}
          </p>
          {imapOn ? (
            <div>
              <SyncInboxButton />
            </div>
          ) : null}
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
