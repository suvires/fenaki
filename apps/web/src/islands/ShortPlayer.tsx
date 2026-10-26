import { PlayerGate, type PlayerGateProps } from '@fenaki/ui'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { embedUrl } from '../lib/embed.ts'
import { trackPlayer } from '../lib/playerTracking.ts'

interface ShortPlayerProps extends Omit<
  PlayerGateProps,
  'embedSrc' | 'resume' | 'startOverLabel' | 'onFrame'
> {
  locale: string
  slug: string
  /** The official player to embed. Absent for sample shorts: there is nothing to play. */
  source?: { provider: string; externalId: string }
  /** A signed-in viewer: their progress is followed and saved. Anonymous viewers are never tracked. */
  tracking: boolean
  /** An unfinished viewing: where it stopped, and the texts of the two buttons. */
  resume?: { seconds: number; label: string; startOverLabel: string }
}

/**
 * The short page's player: the gate before consent, then the official embed. For a signed-in
 * viewer it also offers to resume an unfinished viewing and saves their progress through the
 * player's own postMessage API (see lib/playerProgress.ts); nobody else is tracked.
 */
export function ShortPlayer({ locale, slug, source, tracking, resume, ...gate }: ShortPlayerProps) {
  // YouTube sends its events to the origin it is told; the page's own, known once in the browser.
  const origin = useMemo(
    () => (typeof window === 'undefined' ? undefined : window.location.origin),
    [],
  )
  const embed = (start?: number) =>
    source
      ? embedUrl(source.provider, source.externalId, {
          origin: tracking ? origin : undefined,
          start,
        })
      : undefined

  const stop = useRef<() => void>(undefined)
  const onFrame = useCallback(
    (frame: HTMLIFrameElement | null) => {
      stop.current?.()
      stop.current = undefined
      if (frame && tracking && source)
        stop.current = trackPlayer({ frame, provider: source.provider, slug, locale })
    },
    [tracking, source, slug, locale],
  )
  useEffect(() => () => stop.current?.(), [])

  return (
    <PlayerGate
      {...gate}
      embedSrc={embed()}
      resume={resume ? { label: resume.label, embedSrc: embed(resume.seconds) } : undefined}
      startOverLabel={resume?.startOverLabel}
      onFrame={onFrame}
    />
  )
}
