import { defaultLocale, formatDuration, type Locale } from '@fenaki/i18n'
import { cx } from '../foundations/cx.ts'

export interface DurationProps {
  /** The stored running time. */
  seconds: number
  locale?: Locale
  /** Secondary color by default; false for the main text color. */
  muted?: boolean
  /** Take the surrounding text color (over a still, which sets its own) instead of a token's. */
  inherit?: boolean
  className?: string
}

/** A short's running time in minutes, formatted with Intl. The only place durations are formatted. */
export function Duration({
  seconds,
  locale = defaultLocale,
  muted = true,
  inherit = false,
  className,
}: DurationProps) {
  return (
    <span
      className={cx(
        'font-mono text-timecode tabular-nums whitespace-nowrap',
        !inherit && (muted ? 'text-ink-muted' : 'text-ink'),
        className,
      )}
    >
      {formatDuration(seconds, locale)}
    </span>
  )
}
