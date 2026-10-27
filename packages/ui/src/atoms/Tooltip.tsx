import { cx } from '../foundations/cx.ts'

export interface TooltipProps {
  /** The name of the control it labels, shown above it. */
  children: string
  /** Shown or not: the control decides (hover, focus). */
  open: boolean
  className?: string
}

/**
 * A small label that sits above a control, on the light surface, with an arrow pointing at it.
 * Place it inside a `relative` wrapper around the control. It repeats the control's accessible
 * name, so it is hidden from screen readers.
 */
export function Tooltip({ children, open, className }: TooltipProps) {
  return (
    <span
      aria-hidden="true"
      data-open={open ? '' : undefined}
      className={cx(
        'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none whitespace-nowrap',
        'rounded-xs bg-ink text-sala-0 px-2 py-1 text-label',
        'invisible opacity-0 data-open:visible data-open:opacity-100',
        className,
      )}
    >
      {children}
      <span className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 size-(--size-tooltip-arrow) bg-ink" />
    </span>
  )
}
