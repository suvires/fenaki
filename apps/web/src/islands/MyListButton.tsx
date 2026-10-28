import { Button, LabelledIconButton, type ButtonProps } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { has, subscribe, toggle, type NewSavedShort } from '../lib/myList.ts'

interface MyListButtonProps {
  short: NewSavedShort
  /** «Añadir a mi lista» */
  label: string
  /** «En mi lista», or «Quitar de mi lista» on an icon-only button. */
  savedLabel: string
  size?: ButtonProps['size']
  /** Only the icon, with the label in a tooltip and as its accessible name (a short's hero). */
  iconOnly?: boolean
  /** Signed in: whether the account has it, as the server rendered it, so nothing flickers. */
  initialSaved?: boolean
}

/**
 * Saves a short to the viewer's list: the account's when signed in, else this browser's. Signed
 * out, the server and the first client render show the unsaved state and the stored state is read
 * after hydration; signed in, the server already knows and renders it.
 */
export function MyListButton({
  short,
  label,
  savedLabel,
  size = 'md',
  iconOnly = false,
  initialSaved = false,
}: MyListButtonProps) {
  const [saved, setSaved] = useState(initialSaved)

  useEffect(() => {
    const sync = () => setSaved(has(short.slug))
    sync()
    return subscribe(sync)
  }, [short.slug])

  if (iconOnly)
    return (
      <LabelledIconButton
        icon={saved ? 'check' : 'plus'}
        label={saved ? savedLabel : label}
        variant="translucent"
        size={size}
        aria-pressed={saved}
        onClick={() => toggle(short)}
      />
    )
  return (
    <Button
      variant="secondary"
      size={size}
      icon={saved ? 'check' : 'plus'}
      aria-pressed={saved}
      onClick={() => toggle(short)}
    >
      {saved ? savedLabel : label}
    </Button>
  )
}
