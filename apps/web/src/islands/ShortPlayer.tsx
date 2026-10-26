import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button, Checkbox, Dialog, PlayerGate, type PlayerGateProps } from '@fenaki/ui'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { embedUrl } from '../lib/embed.ts'
import {
  isPlayerProvider,
  isRemembered,
  remember,
  type PlayerProvider,
} from '../lib/playerConsent.ts'
import { trackPlayer } from '../lib/playerTracking.ts'

/** Each provider's own privacy policy, linked from the consent dialog. */
const POLICIES: Record<PlayerProvider, string> = {
  youtube: 'https://policies.google.com/privacy',
  vimeo: 'https://vimeo.com/privacy',
}

interface ShortPlayerProps extends Omit<
  PlayerGateProps,
  'embedSrc' | 'resume' | 'startOverLabel' | 'onFrame'
> {
  locale: Locale
  slug: string
  /** The provider of the short's player (`youtube`, `vimeo`): the consent dialog speaks of it. */
  provider?: string
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
export function ShortPlayer({
  locale,
  slug,
  provider,
  source,
  tracking,
  resume,
  ...gate
}: ShortPlayerProps) {
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

  // The play waiting for the viewer's answer in the consent dialog.
  const [pending, setPending] = useState<() => void>()
  const consentProvider = isPlayerProvider(provider) ? provider : undefined
  const confirmPlay = consentProvider
    ? (play: () => void) => {
        if (isRemembered(consentProvider)) play()
        else setPending(() => play)
      }
    : undefined

  return (
    <>
      <PlayerGate
        {...gate}
        confirmPlay={confirmPlay}
        embedSrc={embed()}
        resume={resume ? { label: resume.label, embedSrc: embed(resume.seconds) } : undefined}
        startOverLabel={resume?.startOverLabel}
        onFrame={onFrame}
      />
      {consentProvider ? (
        <ConsentDialog
          locale={locale}
          provider={consentProvider}
          open={pending !== undefined}
          onCancel={() => setPending(undefined)}
          onAccept={(remembered) => {
            if (remembered) remember(consentProvider)
            pending?.()
            setPending(undefined)
          }}
        />
      ) : null}
    </>
  )
}

interface ConsentDialogProps {
  locale: Locale
  provider: PlayerProvider
  open: boolean
  onCancel: () => void
  onAccept: (remember: boolean) => void
}

/**
 * Asks before the third-party player loads: what the provider receives (the viewer's IP address
 * and what its player keeps in the browser), with its privacy policy. «Aceptar y reproducir» is
 * the consent; the viewer may have it remembered for that provider.
 */
function ConsentDialog({ locale, provider, open, onCancel, onAccept }: ConsentDialogProps) {
  const t = createTranslator(locale)
  const name = t(`providers.${provider}`)
  const rememberId = useId()
  const [checked, setChecked] = useState(false)
  const points = (['ip', 'storage', 'mode'] as const).map((point) =>
    t(`short.player.consent.${provider}.${point}`),
  )
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={t('short.player.consent.title', { provider: name })}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('short.player.consent.cancel')}
          </Button>
          <Button variant="primary" icon="play" onClick={() => onAccept(checked)}>
            {t('short.player.consent.accept')}
          </Button>
        </>
      }
    >
      <p className="m-0">{t(`short.player.consent.${provider}.intro`)}</p>
      <ul className="m-0 grid gap-2 pl-5 list-disc">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="m-0">{t('short.player.consent.fenaki')}</p>
      <p className="m-0">
        <a
          href={POLICIES[provider]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline underline-offset-4 hover:no-underline rounded-xs focus-visible:focus-ring"
        >
          {t('short.player.consent.policy', { provider: name })}
        </a>
      </p>
      <Checkbox
        id={rememberId}
        checked={checked}
        onChange={(event) => setChecked(event.currentTarget.checked)}
      >
        {t('short.player.consent.remember', { provider: name })}
      </Checkbox>
      <p className="m-0 text-meta">{t('short.player.consent.change')}</p>
    </Dialog>
  )
}
