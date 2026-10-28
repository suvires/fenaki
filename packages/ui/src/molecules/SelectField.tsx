import type { SelectHTMLAttributes } from 'react'
import { cx } from '../foundations/cx.ts'
import { Icon } from '../foundations/Icon.tsx'

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string
  /** Always visible, like TextField's. */
  label: string
  options: { value: string; label: string }[]
  /** A first option with no value, so the viewer has to choose: «Elige una opción». */
  placeholder?: string
  hint?: string
  /** Replaces the hint. Always a sentence that says how to fix it. */
  error?: string
  className?: string
}

/** A labeled native select, sized and styled like TextField. */
export function SelectField({
  id,
  label,
  options,
  placeholder,
  hint,
  error,
  className,
  ...selectProps
}: SelectFieldProps) {
  const describedBy = error || hint ? `${id}-description` : undefined
  return (
    <div className={cx('grid gap-2 min-w-0', className)}>
      <label htmlFor={id} className="text-small-strong text-primary">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(
            'appearance-none w-full h-(--control-height-lg) box-border pl-4 pr-12 min-w-0',
            'text-primary bg-raised border rounded-control cursor-pointer focus-visible:focus-ring',
            error ? 'border-danger' : 'border-strong',
          )}
          {...selectProps}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size="md"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary"
        />
      </div>
      {describedBy ? (
        <p
          id={describedBy}
          className={cx('m-0 text-small', error ? 'text-danger' : 'text-secondary')}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}
