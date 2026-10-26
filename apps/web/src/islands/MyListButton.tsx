import { Button, type ButtonProps } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { has, subscribe, toggle, type NewSavedShort } from '../lib/myList.ts'

interface MyListButtonProps {
  short: NewSavedShort
  /** «Añadir a mi lista» */
  label: string
  /** «En mi lista» */
  savedLabel: string
  size?: ButtonProps['size']
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
  initialSaved = false,
}: MyListButtonProps) {
  const [saved, setSaved] = useState(initialSaved)

  useEffect(() => {
    const sync = () => setSaved(has(short.slug))
    sync()
    return subscribe(sync)
  }, [short.slug])

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
