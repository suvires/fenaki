import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { inLanguage, label, type AdminLabel } from '../labels.ts'
import type { Short, Source } from '../payload-types.ts'
import { CheckEmbedsButton } from './CheckEmbedsButton.tsx'

const text = {
  title: label('Embed problems', 'Problemas de embeds'),
  intro: label(
    'Sources the nightly check found unplayable, and the shorts it hid. A hidden short stays withdrawn until an editor fixes its source and publishes it again.',
    'Fuentes que la comprobación nocturna encontró sin reproducción y cortos que ocultó. Un corto oculto sigue retirado hasta que alguien arregle su fuente y lo vuelva a publicar.',
  ),
  hidden: label('Hidden shorts', 'Cortos ocultos'),
  sources: label('Sources with problems', 'Fuentes con problemas'),
  inconclusive: label('Not answered on the last check', 'Sin respuesta en la última comprobación'),
  none: label('Nothing to fix.', 'Nada que arreglar.'),
  short: label('Short', 'Corto'),
  reason: label('Reason', 'Motivo'),
  since: label('Since', 'Desde'),
  source: label('Source', 'Fuente'),
  note: label('What the check found', 'Lo que encontró la comprobación'),
  status: label('Status', 'Estado'),
  playsAgain: label('Its source plays again', 'Su fuente vuelve a reproducirse'),
} satisfies Record<string, AdminLabel>

const reasons: Record<string, AdminLabel> = {
  broken: label('The video no longer exists', 'El vídeo ya no existe'),
  private: label('The video is private', 'El vídeo es privado'),
  'not-embeddable': label('Embedding is disabled', 'Ha desactivado la inserción'),
  'age-restricted': label('Age restricted', 'Restringido por edad'),
}

const sourceReason = (source: Source) =>
  source.status === 'broken' || source.status === 'private'
    ? source.status
    : source.embeddable === false
      ? 'not-embeddable'
      : source.ageRestricted
        ? 'age-restricted'
        : undefined

/** /admin/embed-problems: what the embed checker found, with links to fix each document. */
export async function EmbedProblems({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect(`${req.payload.config.routes.admin}/login`)
  const language = req.i18n.language
  const t = (key: keyof typeof text) => inLanguage(text[key], language)
  const admin = req.payload.config.routes.admin
  const date = (value: string | null | undefined) =>
    value ? new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(value)) : '—'

  const [hidden, problems, inconclusive] = await Promise.all([
    req.payload.find({
      collection: 'shorts',
      where: { hiddenReason: { exists: true } },
      sort: '-hiddenAt',
      depth: 0,
      limit: 0,
      pagination: false,
      req,
    }),
    req.payload.find({
      collection: 'sources',
      where: {
        or: [
          { status: { in: ['broken', 'private'] } },
          { embeddable: { equals: false } },
          { ageRestricted: { equals: true } },
        ],
      },
      sort: '-problemSince',
      depth: 1,
      limit: 0,
      pagination: false,
      req,
    }),
    req.payload.find({
      collection: 'sources',
      where: { checkNote: { like: 'Inconclusive' } },
      depth: 1,
      limit: 0,
      pagination: false,
      req,
    }),
  ])
  const unplayable = new Set(
    problems.docs.map((s) => (typeof s.short === 'object' ? s.short.id : s.short)),
  )
  const shortCell = (short: number | Short) =>
    typeof short === 'object' ? (
      <a href={`${admin}/collections/shorts/${short.id}`}>{short.title}</a>
    ) : (
      <a href={`${admin}/collections/shorts/${short}`}>#{short}</a>
    )
  const sourceCell = (source: Source) => (
    <a href={`${admin}/collections/sources/${source.id}`}>
      {source.provider} · {source.externalId}
    </a>
  )

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
          <div>
            <CheckEmbedsButton />
          </div>

          <h2 style={{ margin: 0 }}>
            {t('hidden')} ({hidden.totalDocs})
          </h2>
          {hidden.docs.length === 0 ? (
            <p>{t('none')}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('short')}</th>
                  <th>{t('reason')}</th>
                  <th>{t('since')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {hidden.docs.map((short) => (
                  <tr key={short.id}>
                    <td>{shortCell(short)}</td>
                    <td>
                      {short.hiddenReason
                        ? inLanguage(reasons[short.hiddenReason] ?? text.reason, language)
                        : ''}
                    </td>
                    <td>{date(short.hiddenAt)}</td>
                    <td>{unplayable.has(short.id) ? '' : t('playsAgain')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 style={{ margin: 0 }}>
            {t('sources')} ({problems.totalDocs})
          </h2>
          {problems.docs.length === 0 ? (
            <p>{t('none')}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('short')}</th>
                  <th>{t('source')}</th>
                  <th>{t('reason')}</th>
                  <th>{t('since')}</th>
                  <th>{t('note')}</th>
                </tr>
              </thead>
              <tbody>
                {problems.docs.map((source) => {
                  const reason = sourceReason(source)
                  return (
                    <tr key={source.id}>
                      <td>{shortCell(source.short)}</td>
                      <td>{sourceCell(source)}</td>
                      <td>{reason ? inLanguage(reasons[reason] ?? text.reason, language) : ''}</td>
                      <td>{date(source.problemSince)}</td>
                      <td>{source.checkNote}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {inconclusive.docs.length > 0 ? (
            <>
              <h2 style={{ margin: 0 }}>
                {t('inconclusive')} ({inconclusive.totalDocs})
              </h2>
              <table className="table">
                <tbody>
                  {inconclusive.docs.map((source) => (
                    <tr key={source.id}>
                      <td>{shortCell(source.short)}</td>
                      <td>{sourceCell(source)}</td>
                      <td>{source.checkNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
