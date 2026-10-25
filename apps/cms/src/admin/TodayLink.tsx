'use client'
import { useConfig, useTranslation } from '@payloadcms/ui'
import { inLanguage, label } from '../labels.ts'

const text = label('Today (sales)', 'Hoy (comercial)')

/** In the admin navigation, after the collections. */
export function TodayLink() {
  const { config } = useConfig()
  const { i18n } = useTranslation()
  return (
    <a className="nav__link" href={`${config.routes.admin}/today`}>
      <span className="nav__link-label">{inLanguage(text, i18n.language)}</span>
    </a>
  )
}
