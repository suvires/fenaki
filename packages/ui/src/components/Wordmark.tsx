export interface WordmarkProps {
  /** Accessible name: the brand name, from the locale file. */
  label: string
  className?: string
}

/**
 * The Fenaki logotype: «FENAKI» in Big Shoulders 800, outlined so it never depends on the font.
 * Drawn in currentColor; size it by height with a spacing class such as h-6 (the width follows). Same drawing as
 * `src/assets/wordmark.svg`, which is the file to use outside React (emails, OG images, print).
 */
export function Wordmark({ label, className }: WordmarkProps) {
  return (
    <svg viewBox="0 0 251.83 83.2" role="img" aria-label={label} className={className}>
      <path
        fill="currentColor"
        d="M0 83.2V0H34.11V12.58H14.3V34.63H33.07V47.22H14.3V83.2ZM41.49 83.2V0H75.61V12.58H55.79V34.63H74.57V47.22H55.79V70.62H75.61V83.2ZM83.3 83.2V0H104.26L110.24 26.47L116.17 70.62H118.82L116.17 34.74L115.02 0H128.85V83.2H106.86L100.77 55.59L96.3 12.53H93.44L95.89 51.38L97.13 83.2ZM135.51 83.2 146.64 0H169.41L180.54 83.2H165.88L164.06 64.79H151.99L150.17 83.2ZM153.29 52.21H162.76L160.89 33.85L159.48 12.58H156.57L155.17 33.85ZM187.2 83.2V0H202.43L202.23 20.12L199.68 39.1H202.33L207.58 19.81L214.81 0H230.46L216.84 34.68L231.14 83.2H216.68L207.32 50.6L201.76 62.92V83.2ZM237.53 83.2V0H251.83V83.2Z"
      />
    </svg>
  )
}
