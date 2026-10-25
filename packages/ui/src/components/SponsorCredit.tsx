import { cx } from '../cx.ts'

export interface SponsorCreditProps {
  /** «Presentada por». */
  label: string
  name: string
  className?: string
}

/** The sponsor's credit. Only on telon grounds, never on a short's page or near the player. */
export function SponsorCredit({ label, name, className }: SponsorCreditProps) {
  return (
    <p className={cx('flex flex-wrap items-baseline gap-2 m-0 text-meta', className)}>
      <span className="font-mono text-label-s uppercase opacity-secondary">{label}</span>
      <span className="text-meta-strong">{name}</span>
    </p>
  )
}
