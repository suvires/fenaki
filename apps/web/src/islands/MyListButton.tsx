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
}

/**
 * Saves a short to the viewer's list in this browser. The server and the first client render show
 * the unsaved state; the stored state is read after hydration.
 */
export function MyListButton({ short, label, savedLabel, size = 'md' }: MyListButtonProps) {
  const [saved, setSaved] = useState(false)

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
