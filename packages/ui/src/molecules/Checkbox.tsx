import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  id: string
  /** The whole label is clickable. */
  children: ReactNode
  className?: string
}

/** A native checkbox with its label. Unchecked by default: consent is never preselected. */
export function Checkbox({ id, children, className, ...inputProps }: CheckboxProps) {
  return (
    <div className={cx('grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className="size-(--size-icon-md) m-0 mt-hair accent-tungsteno cursor-pointer rounded-xs focus-visible:focus-ring"
        {...inputProps}
      />
      <label htmlFor={id} className="text-small text-ink cursor-pointer">
        {children}
      </label>
    </div>
  )
}
