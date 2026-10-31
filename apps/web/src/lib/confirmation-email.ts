/**
 * The waitlist confirmation email, built from the locale file and the design tokens, in the light
 * palette (email is one of the few places it is for). The result is a listmonk transactional
 * template: listmonk fills `{{ .Tx.Data.confirm_url }}`, `{{ .Tx.Data.site_url }}` and
 * `{{ .Tx.Data.logo_url }}` and `{{ .Tx.Data.font_url }}` when the web app sends it. `pnpm setup:services` uploads it.
 */
import { createRichTranslator, createTranslator, formatWeekday, type Locale } from '@fenaki/i18n'
import { NEWSLETTER_SCHEDULE, type SignupKind } from '@fenaki/waitlist'
import { palettes, typography, variables } from '@fenaki/tokens'

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

/** A token's resolved value, by CSS variable. */
function token(name: string): string {
  const value = variables.dark[name]
  if (value === undefined) throw new Error(`Unknown token ${name}`)
  return value
}

function typeStyle(name: string): string {
  const style = typography[name]
  if (!style) throw new Error(`Unknown type style ${name}`)
  return `font-size:${style.fontSize};line-height:${style.lineHeight};font-weight:${style.fontWeight}`
}

/** Inline HTML for a rich message part: escaped text, or a link given as `{ html }`. */
type Html = { html: string }
const render = (parts: (string | Html)[]) =>
  parts.map((part) => (typeof part === 'string' ? escapeHtml(part) : part.html)).join('')

/** One template per kind of signup: the launch notice, or only the weekly selection. */
export function confirmationEmail(
  locale: Locale,
  kind: SignupKind = 'launch',
): { subject: string; body: string } {
  const t = createTranslator(locale)
  const weekday = formatWeekday(NEWSLETTER_SCHEDULE.weekday, locale)
  const copy =
    kind === 'launch'
      ? {
          subject: t('email.confirm.subject'),
          preview: t('email.confirm.preview'),
          intro: t('email.confirm.intro'),
        }
      : {
          subject: t('email.confirmNewsletter.subject'),
          preview: t('email.confirmNewsletter.preview'),
          intro: t('email.confirmNewsletter.intro', { weekday }),
        }
  const rich = createRichTranslator(locale)
  const color = palettes.light
  const space = (name: string) => token(`--spacing-${name}`)
  const radius = token('--radius-lg')
  const pill = token('--radius-full')
  // A white page with the card in the web's own dark colours, and the web's button: neon pink with
  // dark text (5.2:1 on the pink; white on it would be 3.6:1, too low).
  const card = palettes.dark
  const width = token('--email-max-width')

  const link = (
    href: string,
    label: string,
    textColor = color['text-primary'],
    long = false,
  ): Html => ({
    // A long URL starts on its own line and breaks only if it still does not fit.
    html: `<a href="${href}" style="color:${textColor};text-decoration:underline${long ? ';overflow-wrap:break-word;word-wrap:break-word' : ''}">${escapeHtml(label)}</a>`,
  })
  const paragraph = (html: string, style = typeStyle('body')) =>
    `<p style="margin:0 0 ${space('4')};color:${card['text-primary']};${style}">${html}</p>`

  const fallback = render(
    rich('email.confirm.fallback', {
      url: link(CONFIRM_URL, CONFIRM_URL, card['text-primary'], true),
    }),
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
<title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${color['background-raised']};font-family:${escapeHtml(FONT_STACK)}">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(copy.preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color['background-raised']}">
<tr><td align="center" style="padding:${space('8')} ${space('4')}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width}">
<tr><td style="padding:0 0 ${space('6')}"><a href="${SITE_URL}"><img src="${LOGO_URL}" alt="FENAKI" width="85" height="28" style="display:block;border:0"></a></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width};background:${card['background-canvas']};border-radius:${radius}">
<tr><td style="padding:${space('8')}">
${paragraph(escapeHtml(t('email.confirm.title')), `${typeStyle('title')};margin-bottom:${space('2')}`)}
${paragraph(escapeHtml(copy.intro), typeStyle('body-l'))}
<p style="margin:${space('2')} 0 ${space('6')}"><a href="${CONFIRM_URL}" style="display:block;text-align:center;padding:${space('3')} ${space('6')};background:${card.accent};color:${card['text-on-accent']};${typeStyle('button-lg')};text-decoration:none;border-radius:${pill}">${escapeHtml(t('email.confirm.button'))}</a></p>
${paragraph(fallback, `${typeStyle('small')};color:${card['text-secondary']}`)}
${paragraph(escapeHtml(t('email.confirm.expiry')), `${typeStyle('small')};color:${card['text-secondary']};margin-bottom:0`)}
</td></tr>
</table>
<p style="max-width:${width};margin:${space('4')} auto 0;${typeStyle('meta')};color:${color['text-secondary']}">${footer}</p>
</td></tr>
</table>
</body>
</html>
`
  return { subject: copy.subject, body }
}
