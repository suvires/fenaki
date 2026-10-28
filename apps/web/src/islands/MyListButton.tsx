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
  /**
   * `text` (the default), `icon` (the label in a tooltip and as its accessible name), or `auto`:
   * the icon on a still (inside `data-on-still`, a short's hero before it plays), the text
   * elsewhere. The icon's name says what pressing does: «Quitar de mi lista» when saved.
   */
  display?: 'text' | 'icon' | 'auto'
  /** «Quitar de mi lista»: the icon's name once saved. */
  removeLabel?: string
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
  display = 'text',
  removeLabel,
  initialSaved = false,
}: MyListButtonProps) {
  const [saved, setSaved] = useState(initialSaved)

  useEffect(() => {
    const sync = () => setSaved(has(short.slug))
    sync()
    return subscribe(sync)
  }, [short.slug])

  const icon = (
    <LabelledIconButton
      icon={saved ? 'check' : 'plus'}
      label={saved ? (removeLabel ?? savedLabel) : label}
      variant="translucent"
      size={size}
      aria-pressed={saved}
      onClick={() => toggle(short)}
    />
  )
  const text = (
    <Button
      variant="secondary"
      size={size}
      icon={saved ? 'check' : 'plus'}
      aria-pressed={saved}
      onClick={() => toggle(short)}
      className={display === 'auto' ? 'in-data-on-still:hidden' : undefined}
    >
      {saved ? savedLabel : label}
    </Button>
  )
  if (display === 'icon') return icon
  if (display === 'text') return text
  return (
    <>
      <span className="inline-flex not-in-data-on-still:hidden">{icon}</span>
      {text}
    </>
  )
}
