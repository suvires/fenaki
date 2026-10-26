/**
 * The waitlist confirmation email, built from the locale file and the design tokens, in the light
 * palette (email is one of the few places it is for). The result is a listmonk transactional
 * template: listmonk fills `{{ .Tx.Data.confirm_url }}`, `{{ .Tx.Data.site_url }}` and
 * `{{ .Tx.Data.logo_url }}` and `{{ .Tx.Data.font_url }}` when the web app sends it. `pnpm setup:services` uploads it.
 */
import { createRichTranslator, createTranslator, type Locale } from '@fenaki/i18n'
import { palettes, tokens, type TypeStyle } from '@fenaki/tokens'

const CONFIRM_URL = '{{ .Tx.Data.confirm_url }}'
const SITE_URL = '{{ .Tx.Data.site_url }}'
const LOGO_URL = '{{ .Tx.Data.logo_url }}'
const FONT_URL = '{{ .Tx.Data.font_url }}'

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/**
 * Archivo where the email client loads web fonts (Apple Mail, Outlook for Mac, Thunderbird), Arial
 * where it does not (Gmail, Outlook on Windows): never system-ui, which Outlook turns into Times.
 */
const FONT_STACK = '"Archivo Variable", Archivo, Arial, Helvetica, sans-serif'
const fontFace = (url: string) =>
  `@font-face{font-family:"Archivo Variable";src:url("${url}") format("woff2");font-weight:100 900;font-stretch:62% 125%;font-display:swap}`

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
  const radius = token(tokens.radius, 'radius-hero')
  const pill = token(tokens.radius, 'radius-full')
  // A white page with the card in the web's own dark colours, and the web's button: neon pink with
  // dark text (5.2:1 on the pink; white on it would be 3.6:1, too low).
  const card = palettes.dark
  const width = token(tokens.container, 'email')

  const link = (href: string, label: string, ink = color.ink, long = false): Html => ({
    // A long URL starts on its own line and breaks only if it still does not fit.
    html: `<a href="${href}" style="color:${ink};text-decoration:underline${long ? ';overflow-wrap:break-word;word-wrap:break-word' : ''}">${escapeHtml(label)}</a>`,
  })
  const paragraph = (html: string, style = typeStyle('body')) =>
    `<p style="margin:0 0 ${space('4')};color:${card.ink};${style}">${html}</p>`

  const fallback = render(
    rich('email.confirm.fallback', { url: link(CONFIRM_URL, CONFIRM_URL, card.ink, true) }),
  )
  const footer = render(
    rich('email.confirm.footer', {
      site: link(SITE_URL, 'fenaki.tv'),
      privacyPolicy: link(`${SITE_URL}privacidad`, t('legal.links.privacyPolicyTitle')),
    }),
  )

  const body = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<style>${fontFace(FONT_URL)}</style>
<title>${escapeHtml(t('email.confirm.subject'))}</title>
</head>
<body style="margin:0;padding:0;background:${color['sala-1']};font-family:${escapeHtml(FONT_STACK)}">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(t('email.confirm.preview'))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color['sala-1']}">
<tr><td align="center" style="padding:${space('8')} ${space('4')}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width}">
<tr><td style="padding:0 0 ${space('6')}"><a href="${SITE_URL}"><img src="${LOGO_URL}" alt="FENAKI" width="85" height="28" style="display:block;border:0"></a></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width};background:${card['sala-0']};border-radius:${radius}">
<tr><td style="padding:${space('8')}">
${paragraph(escapeHtml(t('email.confirm.title')), `${typeStyle('title')};margin-bottom:${space('2')}`)}
${paragraph(escapeHtml(t('email.confirm.intro')), typeStyle('body-l'))}
<p style="margin:${space('2')} 0 ${space('6')}"><a href="${CONFIRM_URL}" style="display:block;text-align:center;padding:${space('3')} ${space('6')};background:${card.tungsteno};color:${card['on-tungsteno']};${typeStyle('button-lg')};text-decoration:none;border-radius:${pill}">${escapeHtml(t('email.confirm.button'))}</a></p>
${paragraph(fallback, `${typeStyle('small')};color:${card['ink-muted']}`)}
${paragraph(escapeHtml(t('email.confirm.expiry')), `${typeStyle('small')};color:${card['ink-muted']};margin-bottom:0`)}
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
