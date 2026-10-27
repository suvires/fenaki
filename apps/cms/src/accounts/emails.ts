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
import { palettes, typography, variables } from '@fenaki/tokens'

export type AccountEmailKind = 'verify' | 'reset'

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
  const space = (name: string) => token(`--spacing-${name}`)
  const radius = token('--radius-lg')
  const pill = token('--radius-full')
  // A white page with the card in the web's own dark colours, and the web's button: neon pink with
  // dark text (5.2:1 on the pink; white on it would be 3.6:1, too low).
  const card = palettes.dark
  const width = token('--email-max-width')
  const key = (name: string) => `accountEmail.${kind}.${name}` as MessageKey

  const link = (
    href: string,
    text: string,
    textColor = color['text-primary'],
    long = false,
  ): Html => ({
    // A long URL starts on its own line and breaks only if it still does not fit.
    html: `<a href="${escapeHtml(href)}" style="color:${textColor};text-decoration:underline${long ? ';overflow-wrap:break-word;word-wrap:break-word' : ''}">${escapeHtml(text)}</a>`,
  })
  const paragraph = (html: string, style = typeStyle('body')) =>
    `<p style="margin:0 0 ${space('4')};color:${card['text-primary']};${style}">${html}</p>`

  const fallback = render(
    rich(key('fallback'), { url: link(url, url, card['text-primary'], true) }),
  )
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
<style>${fontFace(`${origin}/email/archivo-latin.woff2`)}</style>
<title>${escapeHtml(t(key('subject')))}</title>
</head>
<body style="margin:0;padding:0;background:${color['background-raised']};font-family:${escapeHtml(FONT_STACK)}">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(t(key('preview')))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color['background-raised']}">
<tr><td align="center" style="padding:${space('8')} ${space('4')}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width}">
<tr><td style="padding:0 0 ${space('6')}"><a href="${escapeHtml(`${origin}/${locale}/`)}"><img src="${escapeHtml(`${origin}/email/logo.png`)}" alt="FENAKI" width="85" height="28" style="display:block;border:0"></a></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${width};background:${card['background-canvas']};border-radius:${radius}">
<tr><td style="padding:${space('8')}">
${paragraph(escapeHtml(t(key('title'))), `${typeStyle('title')};margin-bottom:${space('2')}`)}
${paragraph(escapeHtml(t(key('intro'))), typeStyle('body-l'))}
<p style="margin:${space('2')} 0 ${space('6')}"><a href="${escapeHtml(url)}" style="display:block;text-align:center;padding:${space('3')} ${space('6')};background:${card.accent};color:${card['text-on-accent']};${typeStyle('button-lg')};text-decoration:none;border-radius:${pill}">${escapeHtml(t(key('button')))}</a></p>
${paragraph(fallback, `${typeStyle('small')};color:${card['text-secondary']}`)}
${paragraph(escapeHtml(t(key('ignore'))), `${typeStyle('small')};color:${card['text-secondary']};margin-bottom:0`)}
</td></tr>
</table>
<p style="max-width:${width};margin:${space('4')} auto 0;${typeStyle('meta')};color:${color['text-secondary']}">${footer}</p>
</td></tr>
</table>
</body>
</html>
`
}
