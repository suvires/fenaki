import { useEffect, useRef, useState } from 'react'
import { cx } from '../foundations/cx.ts'
import { Button } from '../atoms/Button.tsx'
import { ShortHero, type ShortHeroProps } from './ShortHero.tsx'

export interface PlayerGateProps {
  title: string
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
  /**
   * Starts once, as if the main button were pressed: the viewer pressed «Ver ahora» on another
   * page. `confirmPlay` still decides (a remembered choice plays; otherwise the dialog asks).
   */
  startOnMount?: boolean
  /** Extra attributes for the play button, such as the analytics event (`data-umami-event`). */
  playAttributes?: Record<`data-${string}`, string>
  /**
   * Before play, the short's page shows the same hero as the home page (still, details, synopsis,
   * «Añadir a mi lista»); its main button plays, and the player takes its place.
   */
  hero?: Omit<
    ShortHeroProps,
    'title' | 'ctaLabel' | 'ctaHref' | 'onCta' | 'ctaAttributes' | 'className'
  >
  className?: string
}

/** The player before consent. The third-party player loads only after «Ver ahora». */
export function PlayerGate({
  title,
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
  startOnMount = false,
  playAttributes,
  hero,
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
  const startedOnMount = useRef(false)
  useEffect(() => {
    if (!startOnMount || startedOnMount.current) return
    startedOnMount.current = true
    start(resume ? resume.embedSrc : embedSrc)
    // Once, when the page asks for it: later prop changes are not a new press.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOnMount])
  // The player once the viewer chose to play: the provider's frame, or what replaces it.
  const player = src ? (
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
      className="absolute inset-0 grid place-content-center p-6 text-center font-mono text-secondary"
    >
      {loadedLabel}
    </div>
  )

  const box = (
    <div
      className={cx(
        'relative aspect-still max-w-full box-border overflow-hidden rounded-lg bg-muted',
        !hero && className,
      )}
    >
      {loaded ? (
        player
      ) : (
        <div className="absolute inset-0 grid content-end gap-3 p-6 bg-linear-to-t from-canvas from-0% to-transparent to-85%">
          <p className="m-0 font-display text-display-l uppercase">{title}</p>
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
  if (!hero) return box
  // The short's page: the still, and every detail under it; playing, the player takes the still's
  // place and the details stay.
  return (
    <ShortHero
      {...hero}
      layout="stacked"
      title={title}
      media={loaded ? player : undefined}
      ctaLabel={loaded ? undefined : resume ? resume.label : playLabel}
      onCta={() => start(resume ? resume.embedSrc : embedSrc)}
      ctaAttributes={playAttributes}
      secondaryAction={
        <>
          {!loaded && resume && startOverLabel ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => start(embedSrc)}
              {...playAttributes}
            >
              {startOverLabel}
            </Button>
          ) : null}
          {hero.secondaryAction}
        </>
      }
      className={className}
    />
  )
}
