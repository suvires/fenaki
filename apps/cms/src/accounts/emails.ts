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
  const radius = token(tokens.radius, 'radius-hero')
  const pill = token(tokens.radius, 'radius-full')
  // A white page with the card in the web's own dark colours, and the web's button: neon pink with
  // dark text (5.2:1 on the pink; white on it would be 3.6:1, too low).
  const card = palettes.dark
  const width = token(tokens.container, 'email')
  const key = (name: string) => `accountEmail.${kind}.${name}` as MessageKey

  const link = (href: string, text: string, ink = color.ink, long = false): Html => ({
    // A long URL may break anywhere; the words around it never do.
    html: `<a href="${escapeHtml(href)}" style="color:${ink};text-decoration:underline${long ? ';word-break:break-all' : ''}">${escapeHtml(text)}</a>`,
  })
  const paragraph = (html: string, style = typeStyle('body')) =>
    `<p style="margin:0 0 ${space('4')};color:${card.ink};${style}">${html}</p>`

  const fallback = render(rich(key('fallback'), { url: link(url, url, card.ink, true) }))
  const footer = render(
    rich(key('footer'), {
      site: link(`${origin}/${locale}/`, 'fenaki.tv'),
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
<body style="margin:0;padding:0;background:${color['sala-1']};font-family:${escapeHtml(tokens.type.families.text)}">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(t(key('preview')))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color['sala-1']}">
<tr><td align="center" style="padding:${space('8')} ${space('4')}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width}">
<tr><td style="padding:0 0 ${space('6')}"><a href="${escapeHtml(`${origin}/${locale}/`)}"><img src="${escapeHtml(`${origin}/email/logo.png`)}" alt="FENAKI" width="85" height="28" style="display:block;border:0"></a></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width};background:${card['sala-0']};border-radius:${radius}">
<tr><td style="padding:${space('8')}">
${paragraph(escapeHtml(t(key('title'))), `${typeStyle('title')};margin-bottom:${space('2')}`)}
${paragraph(escapeHtml(t(key('intro'))), typeStyle('body-l'))}
<p style="margin:${space('2')} 0 ${space('6')}"><a href="${escapeHtml(url)}" style="display:block;text-align:center;padding:${space('3')} ${space('6')};background:${card.tungsteno};color:${card['on-tungsteno']};${typeStyle('button-lg')};text-decoration:none;border-radius:${pill}">${escapeHtml(t(key('button')))}</a></p>
${paragraph(fallback, `${typeStyle('small')};color:${card['ink-muted']}`)}
${paragraph(escapeHtml(t(key('ignore'))), `${typeStyle('small')};color:${card['ink-muted']};margin-bottom:0`)}
</td></tr>
</table>
<p style="max-width:${width};margin:${space('4')} auto 0;${typeStyle('meta')};color:${color['ink-muted']}">${footer}</p>
</td></tr>
</table>
</body>
</html>
`
}
