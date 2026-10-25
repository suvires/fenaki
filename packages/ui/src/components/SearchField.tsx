import type { InputHTMLAttributes } from 'react'
import { cx } from '../cx.ts'
import { Icon } from './Icon.tsx'

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Visually hidden, for screen readers. */
  label: string
  placeholder?: string
  id?: string
  defaultValue?: string
}

/** Free-text search over titles, directors and themes. Never shows a spinner. */
export function SearchField({
  label,
  id = 'sx-search',
  className,
  ...inputProps
}: SearchFieldProps) {
  return (
    <div className={cx('relative flex items-center w-full max-w-search text-ink-muted', className)}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Icon name="search" size="md" className="absolute left-3 pointer-events-none" />
      <input
        id={id}
        type="search"
        className={cx(
          'w-full h-(--size-control-search) box-border pr-4 pl-(--size-control-search)',
          'text-ink bg-sala-1 border border-line-strong rounded-sm placeholder:text-ink-muted',
          'focus-visible:focus-ring',
        )}
        {...inputProps}
      />
    </div>
  )
}
