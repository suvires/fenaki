import { useState } from 'react'
import { IconButton, type IconButtonProps } from '../atoms/IconButton.tsx'
import { Tooltip } from '../atoms/Tooltip.tsx'

/**
 * An icon button that shows what it does in a tooltip above it, on hover and on focus: for actions
 * with no visible text (a short's preview, its page's hero).
 */
export function LabelledIconButton(props: IconButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <IconButton {...props} />
      <Tooltip open={open}>{props.label}</Tooltip>
    </span>
  )
}
