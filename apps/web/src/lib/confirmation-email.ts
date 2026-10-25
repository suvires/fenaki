/**
 * The waitlist confirmation email, built from the locale file and the design tokens, in the light
 * palette (email is one of the few places it is for). The result is a listmonk transactional
 * template: listmonk fills `{{ .Tx.Data.confirm_url }}` and `{{ .Tx.Data.site_url }}` when the web
 * app sends it. `pnpm setup:services` uploads it.
 */
import { createRichTranslator, createTranslator, type Locale } from '@shortix/i18n'
import { palettes, tokens, type TypeStyle } from '@shortix/tokens'

const CONFIRM_URL = '{{ .Tx.Data.confirm_url }}'
const SITE_URL = '{{ .Tx.Data.site_url }}'

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

function token(group: { tokens: { name: string; value: string }[] }, name: string): string {
  const found = group.tokens.find((t) => t.name === name)
  if (!found) throw new Error(`Unknown token ${name}`)
  return found.value
}

function typeStyle(name: string): string {
  const style = tokens.type.groups.flatMap((g) => g.styles).find((s) => s.name === name) as
    TypeStyle | undefined
  if (!style) throw new Error(`Unknown type style ${name}`)
  return `font-size:${style.fontSize};line-height:${style.lineHeight};font-weight:${style.fontWeight}`
}

/** Inline HTML for a rich message part: escaped text, or a link given as `{ html }`. */
type Html = { html: string }
const render = (parts: (string | Html)[]) =>
  parts.map((part) => (typeof part === 'string' ? escapeHtml(part) : part.html)).join('')

export function confirmationEmail(locale: Locale): { subject: string; body: string } {
  const t = createTranslator(locale)
  const rich = createRichTranslator(locale)
  const color = palettes.light
  const space = (name: string) => token(tokens.spacing, `space-${name}`)
  const radius = token(tokens.radius, 'radius-sm')
  const width = token(tokens.container, 'note')

  const link = (href: string, label: string): Html => ({
    html: `<a href="${href}" style="color:${color.ink};text-decoration:underline">${escapeHtml(label)}</a>`,
  })
  const paragraph = (html: string, style = typeStyle('body')) =>
    `<p style="margin:0 0 ${space('4')};color:${color.ink};${style}">${html}</p>`

  const fallback = render(rich('email.confirm.fallback', { url: link(CONFIRM_URL, CONFIRM_URL) }))
  const footer = render(
    rich('email.confirm.footer', {
      legalNotice: link(`${SITE_URL}aviso-legal`, t('legal.links.legalNotice')),
      privacyPolicy: link(`${SITE_URL}privacidad`, t('legal.links.privacyPolicyTitle')),
    }),
  )

  const body = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(t('email.confirm.subject'))}</title>
</head>
<body style="margin:0;padding:0;background:${color['sala-0']};font-family:${escapeHtml(tokens.type.families.text)}">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(t('email.confirm.preview'))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color['sala-0']}">
<tr><td align="center" style="padding:${space('8')} ${space('4')}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width};background:${color['sala-1']};border:1px solid ${color.line};border-radius:${radius}">
<tr><td style="padding:${space('8')}">
${paragraph(escapeHtml(t('email.confirm.greeting')))}
${paragraph(escapeHtml(t('email.confirm.intro')))}
${paragraph(escapeHtml(t('email.confirm.action')))}
<p style="margin:0 0 ${space('6')}"><a href="${CONFIRM_URL}" style="display:inline-block;padding:${space('3')} ${space('6')};background:${color.tungsteno};color:${color['on-tungsteno']};${typeStyle('button-lg')};text-decoration:none;border-radius:${radius}">${escapeHtml(t('email.confirm.button'))}</a></p>
${paragraph(fallback, `${typeStyle('small')};color:${color['ink-muted']};word-break:break-all`)}
${paragraph(escapeHtml(t('email.confirm.expiry')))}
${paragraph(`${escapeHtml(t('email.confirm.signature'))}<br>${escapeHtml(t('email.confirm.motto'))}`)}
</td></tr>
</table>
<p style="max-width:${width};margin:${space('4')} auto 0;${typeStyle('meta')};color:${color['ink-muted']}">${footer}</p>
</td></tr>
</table>
</body>
</html>
`
  return { subject: t('email.confirm.subject'), body }
}
