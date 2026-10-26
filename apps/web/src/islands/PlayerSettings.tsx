import { createTranslator, type Locale } from '@fenaki/i18n'
import { Button } from '@fenaki/ui'
import { useEffect, useState } from 'react'
import { forget, isRemembered, PLAYER_PROVIDERS, subscribe } from '../lib/playerConsent.ts'

interface PlayerSettingsProps {
  locale: Locale
}

/** Each player provider and whether it loads without asking, with the way to withdraw that choice. */
export function PlayerSettings({ locale }: PlayerSettingsProps) {
  const t = createTranslator(locale)
  // Read in the browser: the server never knows the choice, so it renders every provider as «ask».
  const [remembered, setRemembered] = useState<Record<string, boolean>>({})
  useEffect(() => {
    const sync = () =>
      setRemembered(Object.fromEntries(PLAYER_PROVIDERS.map((p) => [p, isRemembered(p)])))
    sync()
    return subscribe(sync)
  }, [])

  return (
    <ul className="m-0 p-0 list-none grid gap-3">
      {PLAYER_PROVIDERS.map((provider) => (
        <li
          key={provider}
          data-player-provider={provider}
          className="flex flex-wrap items-center justify-between gap-3 rounded-panel bg-sala-1 p-4"
        >
          <div className="grid gap-1">
            <span className="text-body text-ink">{t(`providers.${provider}`)}</span>
            <span className="text-meta text-ink-muted">
              {remembered[provider] ? t('playerSettings.allowed') : t('playerSettings.ask')}
            </span>
          </div>
          {remembered[provider] ? (
            <Button variant="secondary" size="sm" onClick={() => forget(provider)}>
              {t('playerSettings.withdraw')}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
