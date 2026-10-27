import { useState, useSyncExternalStore } from 'react'
import { Button } from '../atoms/Button.tsx'
import { Dialog } from './Dialog.tsx'

export interface ShareTarget {
  /** The network or app, such as «WhatsApp». */
  label: string
  /** Its share link, with the page's address and text already in it. */
  href: string
  /** Extra attributes for the link, such as the analytics event (`data-umami-event`). */
  attributes?: Record<`data-${string}`, string>
}

export interface ShareButtonProps {
  /** «Compartir». */
  label: string
  /** What is shared: the page's address, its title and a line of text. */
  url: string
  title: string
  text: string
  /** One button per network or messaging app, in order. */
  targets: ShareTarget[]
  /** The dialog's title, such as «Compartir «Timecode»». */
  dialogTitle: string
  copyLabel: string
  copiedLabel: string
  /** Opens the device's own share sheet, where the browser has one. */
  moreLabel: string
  closeLabel: string
  size?: 'md' | 'lg'
  className?: string
}

/** Whether the browser has a share sheet does not change while the page is open. */
const subscribeNever = () => () => undefined

/** The device's share sheet: the phone's own list of apps. */
function nativeShare(data: { url: string; title: string; text: string }) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return undefined
  return () => navigator.share(data).catch(() => undefined)
}

/**
 * Shares a page. On a phone it opens the device's share sheet (every messaging app installed);
 * elsewhere a dialog with a link per network, «Copiar enlace» and, where the browser has one, the
 * share sheet. The links only leave the site when pressed: nothing loads from the networks before.
 */
export function ShareButton({
  label,
  url,
  title,
  text,
  targets,
  dialogTitle,
  copyLabel,
  copiedLabel,
  moreLabel,
  closeLabel,
  size = 'lg',
  className,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  // Known only in the browser: the server renders the dialog without the share sheet.
  const sheet = useSyncExternalStore(
    subscribeNever,
    () => nativeShare({ url, title, text }) !== undefined,
    () => false,
  )
  const share = sheet ? nativeShare({ url, title, text }) : undefined

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        icon="share"
        className={className}
        onClick={() => {
          if (share && window.matchMedia?.('(pointer: coarse)').matches) void share()
          else {
            setCopied(false)
            setOpen(true)
          }
        }}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={dialogTitle}
        actions={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {closeLabel}
          </Button>
        }
      >
        <ul className="m-0 p-0 list-none grid grid-cols-2 gap-2">
          {targets.map((target) => (
            <li key={target.label} className="grid">
              <Button
                variant="secondary"
                href={target.href}
                target="_blank"
                rel="noopener noreferrer"
                {...target.attributes}
              >
                {target.label}
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copy}>
            {copied ? copiedLabel : copyLabel}
          </Button>
          {share ? (
            <Button variant="secondary" onClick={share}>
              {moreLabel}
            </Button>
          ) : null}
        </div>
        <span role="status" className="sr-only">
          {copied ? copiedLabel : ''}
        </span>
      </Dialog>
    </>
  )
}
