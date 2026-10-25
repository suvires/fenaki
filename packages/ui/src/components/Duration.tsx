import { defaultLocale, formatDuration, type Locale } from '@fenaki/i18n'
import { cx } from '../cx.ts'

export interface DurationProps {
  /** The stored running time. */
  seconds: number
  locale?: Locale
  /** Secondary color by default; false for the main text color. */
  muted?: boolean
  className?: string
}

/** A short's running time in minutes, formatted with Intl. The only place durations are formatted. */
export function Duration({
  seconds,
  locale = defaultLocale,
  muted = true,
  className,
}: DurationProps) {
  return (
    <span
      className={cx(
        'font-mono text-timecode tabular-nums whitespace-nowrap',
        muted ? 'text-ink-muted' : 'text-ink',
        className,
      )}
    >
      {formatDuration(seconds, locale)}
    </span>
  )
}
