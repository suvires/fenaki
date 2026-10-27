import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cx } from '../foundations/cx.ts'

export interface DialogProps {
  open: boolean
  /** Escape, the backdrop or a button closed it: the owner sets `open` back to false. */
  onClose: () => void
  title: string
  children: ReactNode
  /** The buttons, at the end of the panel. */
  actions: ReactNode
  className?: string
}

/**
 * A modal dialog on the native `<dialog>`: the browser keeps focus inside, makes the page behind
 * inert and closes it with Escape. A press on the backdrop closes it too.
 */
export function Dialog({ open, onClose, title, children, actions, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // The panel fills the dialog box, so a press on the dialog element itself is on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
      className={cx(
        'm-auto w-[calc(100%-var(--spacing-8))] max-w-dialog p-0 border-0 rounded-panel bg-sala-2 text-ink shadow-hover',
        'backdrop:bg-sala-1/(--opacity-scrim)',
        className,
      )}
    >
      <div className="grid gap-4 p-6">
        <h2 id={titleId} className="m-0 text-title">
          {title}
        </h2>
        <div className="grid gap-3 text-small text-ink-muted">{children}</div>
        <div className="flex flex-wrap justify-end gap-3 pt-2">{actions}</div>
      </div>
    </dialog>
  )
}
