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
  /** Takes the size of the text around it instead of the timecode's (a short page's facts). */
  inheritSize?: boolean
  className?: string
}

/** A short's running time in minutes, formatted with Intl. The only place durations are formatted. */
export function Duration({
  seconds,
  locale = defaultLocale,
  muted = true,
  inherit = false,
  inheritSize = false,
  className,
}: DurationProps) {
  return (
    <span
      className={cx(
        'font-mono tabular-nums whitespace-nowrap',
        !inheritSize && 'text-timecode',
        !inherit && (muted ? 'text-secondary' : 'text-primary'),
        className,
      )}
    >
      {formatDuration(seconds, locale)}
    </span>
  )
}
