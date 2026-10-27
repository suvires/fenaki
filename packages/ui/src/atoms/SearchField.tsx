import type { InputHTMLAttributes, Ref } from 'react'
import { cx } from '../foundations/cx.ts'
import { Icon } from '../foundations/Icon.tsx'

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Visually hidden, for screen readers. */
  label: string
  placeholder?: string
  id?: string
  defaultValue?: string
  /** The input itself, for focusing it (the header's search opens and focuses it). */
  ref?: Ref<HTMLInputElement>
}

/** Free-text search over titles, directors and themes. Never shows a spinner. */
export function SearchField({
  label,
  id = 'sx-search',
  className,
  ref,
  ...inputProps
}: SearchFieldProps) {
  return (
    <div className={cx('relative flex items-center w-full max-w-search text-secondary', className)}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Icon name="search" size="md" className="absolute left-3 pointer-events-none" />
      <input
        ref={ref}
        id={id}
        type="search"
        className={cx(
          'w-full h-(--search-field-height) box-border pr-4 pl-(--search-field-height)',
          'text-primary bg-raised border border-strong rounded-control placeholder:text-secondary',
          'focus-visible:focus-ring',
        )}
        {...inputProps}
      />
    </div>
  )
}
