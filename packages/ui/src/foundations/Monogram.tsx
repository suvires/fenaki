export interface MonogramProps {
  /** Accessible name: the brand name, from the locale file. */
  label: string
  className?: string
}

/**
 * The Fenaki monogram: the F of the logotype (Big Shoulders 800, outlined), as on the avatar and
 * the favicon. Drawn in currentColor; size it by height with a spacing class (the width follows).
 */
export function Monogram({ label, className }: MonogramProps) {
  return (
    <svg viewBox="0 0 98.4 240" role="img" aria-label={label} className={className}>
      <path fill="currentColor" d="M0 240V0H98.4V36.3H41.25V99.9H95.4V136.2H41.25V240Z" />
    </svg>
  )
}
