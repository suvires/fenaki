import { useState } from 'react'
import { cx } from '../cx.ts'
import { Button } from './Button.tsx'

export interface PlayerGateProps {
  title: string
  /** Names the provider and what it does with cookies. */
  message: string
  playLabel: string
  moreLabel?: string
  moreHref?: string
  /** Announced once the viewer chooses to play. Shown in place of the player when there is no `embedSrc`. */
  loadedLabel: string
  /** The third-party player URL. Nothing is requested from it until the viewer presses play. */
  embedSrc?: string
  /** Accessible name of the player frame. */
  embedTitle?: string
  /**
   * The viewer left this short unfinished: the main button resumes (from `resume.embedSrc`, the
   * player URL starting there) and `startOverLabel` plays from the start (`embedSrc`).
   */
  resume?: { label: string; embedSrc?: string }
  /** «Empezar de nuevo», next to the resume button. */
  startOverLabel?: string
  /** Gets the player frame once it is in the page, and null when it goes: for progress tracking. */
  onFrame?: (frame: HTMLIFrameElement | null) => void
  /**
   * Asked before the player loads: it calls `play` once the viewer agrees (the page's consent
   * dialog). Without it the player loads on the press.
   */
  confirmPlay?: (play: () => void) => void
  /** Extra attributes for the play button, such as the analytics event (`data-umami-event`). */
  playAttributes?: Record<`data-${string}`, string>
  className?: string
}

/** The player before consent. The third-party player loads only after «Ver ahora». */
export function PlayerGate({
  title,
  message,
  playLabel,
  moreLabel,
  moreHref,
  loadedLabel,
  embedSrc,
  embedTitle,
  resume,
  startOverLabel,
  onFrame,
  confirmPlay,
  playAttributes,
  className,
}: PlayerGateProps) {
  // Nothing loads until the viewer chooses; then it is the player URL they chose to start from.
  const [started, setStarted] = useState<{ src?: string } | undefined>()
  const loaded = started !== undefined
  const src = started?.src
  const start = (from?: string) => {
    const play = () => setStarted({ src: from })
    if (confirmPlay) confirmPlay(play)
    else play()
  }
  return (
    <div
      className={cx(
        'relative aspect-still max-w-full box-border overflow-hidden rounded-hero bg-sala-2',
        className,
      )}
    >
      {loaded ? (
        src ? (
          <>
            <span role="status" className="sr-only">
              {loadedLabel}
            </span>
            <iframe
              ref={onFrame}
              src={src}
              title={embedTitle ?? title}
              className="absolute inset-0 size-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </>
        ) : (
          <div
            role="status"
            className="absolute inset-0 grid place-content-center p-6 text-center font-mono text-ink-muted"
          >
            {loadedLabel}
          </div>
        )
      ) : (
        <div className="absolute inset-0 grid content-end gap-3 p-6 bg-linear-to-t from-sala-0 from-0% to-transparent to-85%">
          <p className="m-0 font-display text-display-l uppercase">{title}</p>
          <p className="m-0 max-w-player-text text-small text-ink-muted">{message}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              icon="play"
              onClick={() => start(resume ? resume.embedSrc : embedSrc)}
              {...playAttributes}
            >
              {resume ? resume.label : playLabel}
            </Button>
            {resume && startOverLabel ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => start(embedSrc)}
                {...playAttributes}
              >
                {startOverLabel}
              </Button>
            ) : null}
            {moreLabel ? (
              <Button variant="ghost" href={moreHref ?? '#'}>
                {moreLabel}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
