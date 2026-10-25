/** Plain text of a reply without the quoted history, capped so the CRM stays small. */
export const MAX_BODY_CHARS = 20_000

const WROTE = /(wrote|escribió|escribio|a écrit|schrieb):\s*$/i
const ATTRIBUTION_START = /^(on|el|le|am)\s.+/i
const ORIGINAL = /^[-_ ]*(original message|mensaje original|forwarded message|mensaje reenviado)/i
const HEADER_FROM = /^(from|de|von):\s.+/i
const HEADER_NEXT = /^(sent|enviado|date|fecha|to|para):\s/i

export function stripQuoted(raw: string, max: number = MAX_BODY_CHARS): string {
  const text = raw.replace(/\r\n?/g, '\n').replace(/[^\S\n]+$/gm, '')
  const lines = text.split('\n')
  let end = lines.length
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim()
    const next = (lines[i + 1] ?? '').trim()
    if (
      (ATTRIBUTION_START.test(line) && (WROTE.test(line) || WROTE.test(`${line} ${next}`))) ||
      ORIGINAL.test(line) ||
      /^_{10,}$/.test(line) ||
      (HEADER_FROM.test(line) && HEADER_NEXT.test(next))
    ) {
      end = i
      break
    }
  }
  const kept = lines
    .slice(0, end)
    .filter((line) => !line.startsWith('>'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const result = kept || text.trim()
  // Control characters have no place in a message body; the admin shows it as text only.
  // eslint-disable-next-line no-control-regex
  const clean = result.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}
