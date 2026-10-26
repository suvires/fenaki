/**
 * The emails Payload sends to viewers (account verification and password reset), in Spanish and in
 * the light palette, like the waitlist confirmation. The links point to the SITE's pages
 * (`/es/cuenta/verificar?token=…`, `/es/cuenta/restablecer?token=…`), built from WEB_URL, never to
 * the CMS. The strings come from packages/i18n.
 */
import {
  createRichTranslator,
  createTranslator,
  defaultLocale,
  type Locale,
  type MessageKey,
} from '@fenaki/i18n'
import { palettes, tokens, type TypeStyle } from '@fenaki/tokens'

export type AccountEmailKind = 'verify' | 'reset'

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

type Html = { html: string }
const render = (parts: (string | Html)[]) =>
  parts.map((part) => (typeof part === 'string' ? escapeHtml(part) : part.html)).join('')

/** The site's public address, without a trailing slash. */
export function siteOrigin(env: Record<string, string | undefined> = process.env): string {
  return (env.WEB_URL ?? 'http://localhost:4321').replace(/\/+$/, '')
}

/** The page of the site that consumes a verification or reset token. */
export function accountLink(
  kind: AccountEmailKind,
  token: string,
  locale: Locale = defaultLocale,
  origin = siteOrigin(),
): string {
  const page = kind === 'verify' ? 'verificar' : 'restablecer'
  return `${origin}/${locale}/cuenta/${page}?token=${encodeURIComponent(token)}`
}

export function accountEmailSubject(
  kind: AccountEmailKind,
  locale: Locale = defaultLocale,
): string {
  return createTranslator(locale)(`accountEmail.${kind}.subject`)
}

export function accountEmailHtml(
  kind: AccountEmailKind,
  url: string,
  locale: Locale = defaultLocale,
  origin = siteOrigin(),
): string {
  const t = createTranslator(locale)
  const rich = createRichTranslator(locale)
  const color = palettes.light
  const space = (name: string) => token(tokens.spacing, `space-${name}`)
  const radius = token(tokens.radius, 'radius-sm')
  const width = token(tokens.container, 'note')
  const key = (name: string) => `accountEmail.${kind}.${name}` as MessageKey

  const link = (href: string, text: string): Html => ({
    html: `<a href="${escapeHtml(href)}" style="color:${color.ink};text-decoration:underline">${escapeHtml(text)}</a>`,
  })
  const paragraph = (html: string, style = typeStyle('body')) =>
    `<p style="margin:0 0 ${space('4')};color:${color.ink};${style}">${html}</p>`

  const fallback = render(rich(key('fallback'), { url: link(url, url) }))
  const footer = render(
    rich(key('footer'), {
      legalNotice: link(`${origin}/${locale}/aviso-legal`, t('legal.links.legalNotice')),
      privacyPolicy: link(`${origin}/${locale}/privacidad`, t('legal.links.privacyPolicyTitle')),
    }),
  )

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(t(key('subject')))}</title>
</head>
<body style="margin:0;padding:0;background:${color['sala-0']};font-family:${escapeHtml(tokens.type.families.text)}">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(t(key('preview')))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color['sala-0']}">
<tr><td align="center" style="padding:${space('8')} ${space('4')}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width};background:${color['sala-1']};border:1px solid ${color.line};border-radius:${radius}">
<tr><td style="padding:${space('8')}">
${paragraph(escapeHtml(t(key('greeting'))))}
${paragraph(escapeHtml(t(key('intro'))))}
${paragraph(escapeHtml(t(key('action'))))}
<p style="margin:0 0 ${space('6')}"><a href="${escapeHtml(url)}" style="display:inline-block;padding:${space('3')} ${space('6')};background:${color.tungsteno};color:${color['on-tungsteno']};${typeStyle('button-lg')};text-decoration:none;border-radius:${radius}">${escapeHtml(t(key('button')))}</a></p>
${paragraph(fallback, `${typeStyle('small')};color:${color['ink-muted']};word-break:break-all`)}
${paragraph(escapeHtml(t(key('ignore'))))}
${paragraph(`${escapeHtml(t(key('signature')))}<br>${escapeHtml(t(key('motto')))}`)}
</td></tr>
</table>
<p style="max-width:${width};margin:${space('4')} auto 0;${typeStyle('meta')};color:${color['ink-muted']}">${footer}</p>
</td></tr>
</table>
</body>
</html>
`
}
