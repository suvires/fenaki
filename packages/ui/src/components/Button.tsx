import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../cx.ts'
import { Icon, type IconName } from './Icon.tsx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  /** Renders a link that looks like a button. */
  href?: string
  /** The ground the button sits on. `telon` turns a secondary button into an on-telon outline. */
  surface?: 'sala' | 'telon'
  children: ReactNode
}

const VARIANTS = {
  primary: 'bg-tungsteno text-on-tungsteno border-transparent hover:bg-tungsteno-hover',
  // Translucent and borderless: the ground, or a hero image, shows through, blurred.
  secondary:
    'bg-veil/(--opacity-veil) backdrop-blur-veil text-ink border-transparent hover:bg-veil/(--opacity-veil-hover)',
  ghost: 'bg-transparent text-ink border-transparent underline underline-offset-4',
} as const

/** About 56 % of the control's height, so the icon holds its own next to the label at every size. */
const ICON_SIZES = { sm: 'sm', md: 'lg', lg: 'xl' } as const

/** The one way to trigger an action. One primary button per view. */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  href,
  surface = 'sala',
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  const classes = cx(
    'inline-flex items-center gap-2 rounded-control border cursor-pointer no-underline',
    'transition-[background-color,transform] duration-(--duration-press) ease-standard',
    'active:translate-y-(--size-press) focus-visible:focus-ring motion-reduce:transition-none',
    size === 'lg'
      ? 'h-(--size-control-lg) text-button-lg'
      : size === 'sm'
        ? 'h-(--size-control-sm) text-button-sm'
        : 'h-(--size-control-md) text-button',
    variant === 'ghost' ? 'px-2' : size === 'lg' ? 'px-6' : size === 'sm' ? 'px-3' : 'px-4',
    variant === 'secondary' && surface === 'telon'
      ? 'bg-transparent text-on-telon border-on-telon'
      : VARIANTS[variant],
    className,
  )
  const content = (
    <>
      {icon ? <Icon name={icon} size={ICON_SIZES[size]} /> : null}
      <span>{children}</span>
    </>
  )
  if (href) {
    return (
      <a href={href} className={classes} {...(rest as Record<string, unknown>)}>
        {content}
      </a>
    )
  }
  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {content}
    </button>
  )
}
