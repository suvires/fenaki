import type { ButtonHTMLAttributes, Ref } from 'react'
import { cx } from '../foundations/cx.ts'
import { Icon, type IconName } from '../foundations/Icon.tsx'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName
  /** The accessible name: there is no visible text. */
  label: string
  /** The icon's filled variant, for a chosen state (the thumbs). */
  filled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'translucent'
  size?: 'sm' | 'md' | 'lg'
  /** Renders a link that looks like a button. */
  href?: string
  ref?: Ref<HTMLButtonElement>
}

const VARIANTS = {
  primary: 'bg-accent text-on-accent border-transparent hover:bg-accent-hover',
  // Outlined: it sits on a solid surface, so it needs no translucent fill.
  secondary: 'bg-transparent text-primary border-strong hover:border-inverse',
  // No outline: for buttons grouped inside a surface of their own (the rating pill).
  ghost:
    'bg-transparent text-primary border-transparent hover:bg-translucent/(--opacity-translucent-hover)',
  // Translucent and blurred, like the secondary Button: over images (a rail's arrows).
  translucent:
    'bg-translucent/(--opacity-translucent) backdrop-blur-translucent text-primary border-transparent hover:bg-translucent/(--opacity-translucent-hover)',
} as const

const SIZES = {
  sm: 'size-(--control-height-sm)',
  md: 'size-(--control-height-md)',
  lg: 'size-(--control-height-lg)',
} as const

/** About 56 % of the control's height, as in Button. */
const ICON_SIZES = { sm: 'sm', md: 'lg', lg: 'xl' } as const

/** A round button with only an icon, for actions that repeat on a surface (a short's preview). */
export function IconButton({
  icon,
  label,
  filled,
  variant = 'secondary',
  size = 'md',
  href,
  className,
  type,
  ...rest
}: IconButtonProps) {
  const classes = cx(
    'inline-flex flex-none items-center justify-center rounded-full border cursor-pointer no-underline',
    'transition-[background-color,border-color,transform] duration-(--duration-fast) ease-standard',
    'active:translate-y-(--control-press-offset) focus-visible:focus-ring motion-reduce:transition-none',
    SIZES[size],
    VARIANTS[variant],
    className,
  )
  const content = <Icon name={icon} size={ICON_SIZES[size]} filled={filled} />
  if (href) {
    return (
      <a href={href} aria-label={label} className={classes} {...(rest as Record<string, unknown>)}>
        {content}
      </a>
    )
  }
  return (
    <button type={type ?? 'button'} aria-label={label} className={classes} {...rest}>
      {content}
    </button>
  )
}
