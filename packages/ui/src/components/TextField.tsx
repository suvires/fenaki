import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../cx.ts'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  /** Always visible: a placeholder is an example, never the label. */
  label: string
  /** Shown below the field, and announced with it. */
  hint?: string
  /** Replaces the hint. Always a sentence that says how to fix it, never color alone. */
  error?: string
  /** Beside the field on wide screens and below it on narrow ones, such as the form's submit button. */
  action?: ReactNode
  className?: string
}

/** A labeled single-line field, such as the email on the waitlist. */
export function TextField({
  id,
  label,
  hint,
  error,
  action,
  className,
  ...inputProps
}: TextFieldProps) {
  const describedBy = error || hint ? `${id}-description` : undefined
  const field = (
    <input
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={cx(
        'w-full h-(--size-control-lg) box-border px-4 min-w-0',
        'text-ink bg-sala-1 border rounded-control placeholder:text-ink-muted',
        'focus-visible:focus-ring',
        error ? 'border-danger' : 'border-line-strong',
      )}
      {...inputProps}
    />
  )
  return (
    <div className={cx('grid gap-2 min-w-0', className)}>
      <label htmlFor={id} className="text-small-strong text-ink">
        {label}
      </label>
      {action ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          {field}
          <div>{action}</div>
        </div>
      ) : (
        field
      )}
      {describedBy ? (
        <p
          id={describedBy}
          className={cx('m-0 text-small', error ? 'text-danger' : 'text-ink-muted')}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  )
}
