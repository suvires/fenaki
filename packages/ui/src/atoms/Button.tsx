import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'
import { Icon, type IconName } from '../foundations/Icon.tsx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  /** Renders a link that looks like a button. */
  href?: string
  /** For a link: where it opens and how it relates to the page (`_blank`, `noopener noreferrer`). */
  target?: string
  rel?: string
  /** The ground the button sits on. `sponsored` turns a secondary button into an on-sponsored outline. */
  surface?: 'default' | 'sponsored'
  children: ReactNode
}

const VARIANTS = {
  primary: 'bg-accent text-on-accent border-transparent hover:bg-accent-hover',
  // Translucent and borderless: the ground, or a hero image, shows through, blurred.
  secondary:
    'bg-translucent/(--opacity-translucent) backdrop-blur-translucent text-primary border-transparent hover:bg-translucent/(--opacity-translucent-hover)',
  ghost:
    'bg-transparent text-primary border-transparent underline underline-offset-4 hover:no-underline',
} as const

/** About 56 % of the control's height, so the icon holds its own next to the label at every size. */
const ICON_SIZES = { sm: 'sm', md: 'lg', lg: 'xl' } as const

/** The one way to trigger an action. One primary button per view. */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  href,
  target,
  rel,
  surface = 'default',
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  const classes = cx(
    'inline-flex items-center justify-center gap-2 rounded-control border cursor-pointer no-underline',
    'transition-[background-color,transform] duration-(--duration-fast) ease-standard',
    'active:translate-y-(--control-press-offset) focus-visible:focus-ring motion-reduce:transition-none',
    size === 'lg'
      ? 'h-(--control-height-lg) text-button-lg'
      : size === 'sm'
        ? 'h-(--control-height-sm) text-button-sm'
        : 'h-(--control-height-md) text-button-md',
    variant === 'ghost' ? 'px-2' : size === 'lg' ? 'px-6' : size === 'sm' ? 'px-3' : 'px-4',
    variant === 'secondary' && surface === 'sponsored'
      ? 'bg-transparent text-on-sponsored border-on-sponsored'
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
      <a
        href={href}
        target={target}
        rel={rel}
        className={classes}
        {...(rest as Record<string, unknown>)}
      >
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
