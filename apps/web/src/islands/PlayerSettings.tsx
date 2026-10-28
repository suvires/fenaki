import { createTranslator, type Locale } from '@fenaki/i18n'
import { Checkbox, Notice } from '@fenaki/ui'
import { useEffect, useId, useState } from 'react'
import { isRemembered, PLAYER_PROVIDERS, setRemembered, subscribe } from '../lib/playerConsent.ts'

interface PlayerSettingsProps {
  locale: Locale
}

/** One checkbox per player provider: checked, its shorts play without asking first. */
export function PlayerSettings({ locale }: PlayerSettingsProps) {
  const t = createTranslator(locale)
  const id = useId()
  // Read in the browser: until then every provider renders as «ask», and nothing can be changed.
  const [remembered, setState] = useState<Record<string, boolean>>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const sync = () =>
      setState(Object.fromEntries(PLAYER_PROVIDERS.map((p) => [p, isRemembered(p)])))
    sync()
    return subscribe(sync)
  }, [])

  return (
    <div className="grid gap-3">
      <ul className="m-0 p-0 list-none grid gap-3">
        {PLAYER_PROVIDERS.map((provider) => (
          <li key={provider} data-player-provider={provider} className="rounded-md bg-raised p-4">
            <Checkbox
              id={`${id}-${provider}`}
              checked={remembered?.[provider] ?? false}
              disabled={!remembered}
              onChange={(event) => {
                setFailed(false)
                void setRemembered(provider, event.currentTarget.checked).then((ok) =>
                  setFailed(!ok),
                )
              }}
            >
              {t('playerSettings.allow', { provider: t(`providers.${provider}`) })}
            </Checkbox>
          </li>
        ))}
      </ul>
      {failed ? (
        <Notice tone="danger" role="alert">
          {t('playerSettings.error')}
        </Notice>
      ) : null}
    </div>
  )
}
