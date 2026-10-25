import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { useState } from 'react'
import { cx } from '../cx.ts'

export interface FilterChipsProps {
  /** The group name, read by screen readers. */
  label: string
  options: { value: string; label: string }[]
  /** Controlled selection. */
  value?: string | null
  defaultValue?: string | null
  onChange?: (value: string | null) => void
  className?: string
}

/**
 * Single-choice filters. Pressing the selected chip clears it. Built on Radix toggle buttons
 * (aria-pressed, arrow-key roving focus) and kept to at most one pressed chip.
 */
export function FilterChips({
  label,
  options,
  value,
  defaultValue = null,
  onChange,
  className,
}: FilterChipsProps) {
  const [internal, setInternal] = useState<string | null>(defaultValue)
  const selected = value !== undefined ? value : internal

  function handleChange(values: string[]) {
    const next = values.find((v) => v !== selected) ?? null
    if (value === undefined) setInternal(next)
    onChange?.(next)
  }

  return (
    <ToggleGroup.Root
      type="multiple"
      role="group"
      aria-label={label}
      value={selected ? [selected] : []}
      onValueChange={handleChange}
      className={cx('flex flex-wrap gap-2', className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cx(
            'h-(--size-chip) px-4 rounded-full border border-line-strong bg-transparent text-ink',
            'text-small-strong cursor-pointer hover:bg-sala-2 focus-visible:focus-ring',
            'data-[state=on]:bg-ink data-[state=on]:border-ink data-[state=on]:text-sala-0',
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
